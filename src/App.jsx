import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import styled, {
  createGlobalStyle,
  ThemeProvider,
} from 'styled-components';
import {
  styleReset,
  Window,
  WindowHeader,
  WindowContent,
  Button,
  TextInput,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeadCell,
  TableDataCell,
  Panel,
} from 'react95';
import original from 'react95/dist/themes/original';

// DnD Imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Icons
import {
  Trash2,
  GripVertical,
  Music,
  Minus,
  Plus,
  Mail,
} from 'lucide-react';

// --- Styled Components for Layout ---
const Wrapper = styled.div`
  padding: 1rem 0.5rem;
  display: flex;
  justify-content: center;
  min-height: 100vh;
  box-sizing: border-box;
  background: #008080;
`;

const StyledWindow = styled(Window)`
  width: 100%;
  max-width: 600px;
  min-height: 200px;
  display: flex;
  flex-direction: column;
`;

const StyledWindowHeader = styled(WindowHeader)`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const SearchResultDropdown = styled(Panel)`
  position: absolute;
  width: 100%;
  max-height: 300px;
  overflow-y: auto;
  z-index: 10;
  top: 45px;
  box-shadow: 4px 4px 10px rgba(0, 0, 0, 0.3);
`;

const ResultItem = styled.div`
  padding: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  border-bottom: 1px dotted #c0c0c0;

  &:last-child {
    border-bottom: none;
  }
`;

const StatusPanel = styled(Panel)`
  margin-top: auto;
  padding: 0.8rem;
  background: ${(props) =>
    props.$isOver
      ? props.$isSevere
        ? '#ff0000'
        : '#ffff00'
      : 'inherit'};
  color: ${(props) =>
    props.$isOver && props.$isSevere ? 'white' : 'inherit'};
  text-align: right;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
`;

const ResponsiveFlex = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
`;

// Override React95 TableRow hover styles
const NoHoverTableRow = styled(TableRow)`
  &&:hover {
    background: ${(props) =>
      props.$isDragging ? '#e6e6e6' : 'inherit'};
    color: inherit;
  }
  && td {
    color: inherit;
    vertical-align: middle;
  }
`;

const SlimHeadCell = styled(TableHeadCell)`
  height: 35px !important;
  padding: 0 5px !important;
  white-space: nowrap !important;
  vertical-align: middle;
  line-height: 1;
`;

const MobileTableCell = styled(TableDataCell)`
  padding: 5px !important;
  font-size: 0.9rem;
`;

// Custom Number Input Component
const CustomInputWrapper = styled.div`
  display: inline-flex; // Changed to inline-flex to prevent full width expansion
  align-items: center;
  gap: 2px;
  flex-shrink: 0; // Prevent shrinking
`;

const CenteredInput = styled(TextInput)`
  && {
    width: ${(props) =>
      props.width}px !important; // Force fixed width
    min-width: ${(props) => props.width}px !important;
  }
  input {
    text-align: center;
    padding: 5px !important;
  }
`;

function CustomNumberInput({
  value,
  onChange,
  min = 0,
  max = 999,
  width = 50,
}) {
  const handleDecrement = () => {
    if (value > min) onChange(value - 1);
  };
  const handleIncrement = () => {
    if (value < max) onChange(value + 1);
  };
  const handleChange = (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= min && val <= max) {
      onChange(val);
    } else if (e.target.value === '') {
      onChange(0);
    }
  };

  return (
    <CustomInputWrapper>
      <Button
        onClick={handleDecrement}
        size="sm"
        square
        style={{
          width: 32,
          height: 32,
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Minus size={14} strokeWidth={3} />
      </Button>
      <CenteredInput
        value={value}
        onChange={handleChange}
        width={width}
        type="number"
      />
      <Button
        onClick={handleIncrement}
        size="sm"
        square
        style={{
          width: 32,
          height: 32,
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Plus size={14} strokeWidth={3} />
      </Button>
    </CustomInputWrapper>
  );
}

// Global Rest
const GlobalStyles = createGlobalStyle`
  ${styleReset}
  body, input, select, textarea, button {
    font-family: 'ms_sans_serif' !important;
  }
`;

// Utility: Format Time (00:00)
const formatTime = (ms) => {
  if (!ms && ms !== 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
};

// Utility: Format Time Korean (0분 00초)
const formatTimeKorean = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  let text = '';
  if (minutes > 0) text += `${minutes}분 `;
  if (seconds > 0 || minutes === 0) text += `${seconds}초`;

  return text.trim();
};

// --- Sortable Item Component ---
function SortableRow({ song, onRemove, formatTime }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'default',
    background: isDragging ? '#e6e6e6' : 'inherit',
    touchAction: 'none',
  };

  return (
    <NoHoverTableRow
      ref={setNodeRef}
      style={style}
      {...attributes}
      $isDragging={isDragging}
    >
      {/* 1. Drag Handle */}
      <MobileTableCell style={{ width: '40px', textAlign: 'center' }}>
        <div
          {...listeners}
          style={{
            cursor: 'grab',
            display: 'flex',
            justifyContent: 'center',
            padding: '5px',
          }}
        >
          <GripVertical size={16} color="#888" />
        </div>
      </MobileTableCell>

      {/* 2. Song Info (Title + Artist merged) */}
      <MobileTableCell>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {song.coverUrl ? (
            <img
              src={song.coverUrl}
              alt=""
              style={{
                width: 32,
                height: 32,
                borderRadius: 2,
                border: '1px solid gray',
                flexShrink: 0,
              }}
            />
          ) : (
            <Music size={24} style={{ flexShrink: 0 }} />
          )}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              overflow: 'hidden',
              lineHeight: '1.2',
            }}
          >
            <span
              style={{
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '150px',
                marginBottom: '2px',
              }}
            >
              {song.title}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                color: '#666',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '150px',
              }}
            >
              {song.artist}
            </span>
          </div>
        </div>
      </MobileTableCell>

      {/* 3. Time */}
      <MobileTableCell style={{ textAlign: 'center', width: '50px' }}>
        {formatTime(song.durationMs)}
      </MobileTableCell>

      {/* 4. Delete */}
      <MobileTableCell style={{ textAlign: 'center', width: '40px' }}>
        <Button onClick={() => onRemove(song.id)} size="sm" square>
          <Trash2 size={14} />
        </Button>
      </MobileTableCell>
    </NoHoverTableRow>
  );
}

export default function App() {
  // Settings
  const [targetMinutes, setTargetMinutes] = useState(15);
  const [targetSeconds, setTargetSeconds] = useState(0);

  // Data
  const [songs, setSongs] = useState([]);

  // Search Data
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [spotifyToken, setSpotifyToken] = useState(null);

  // Environment Variables
  const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

  // Manual Mode
  const [manualMode, setManualMode] = useState(false);
  const [manualForm, setManualForm] = useState({
    title: '',
    artist: '',
    minutes: 0,
    seconds: 0,
  });

  // Copy Modal State
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyText, setCopyText] = useState('');

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 1. Get Spotify Token
  useEffect(() => {
    const getToken = async () => {
      if (!CLIENT_ID || !CLIENT_SECRET) return;
      try {
        const credentials = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
        const response = await fetch('/api/token', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'grant_type=client_credentials',
        });
        if (!response.ok) throw new Error('Token fetch failed');
        const data = await response.json();
        setSpotifyToken(data.access_token);
      } catch (err) {
        console.error('Spotify token error:', err);
      }
    };
    getToken();
  }, [CLIENT_ID, CLIENT_SECRET]);

  // 2. Fetch Function (Reusable)
  const fetchTracks = useCallback(
    async (query, offset = 0) => {
      if (!spotifyToken || !query) return;

      try {
        const limit = 20;
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(
            query
          )}&type=track&limit=${limit}&offset=${offset}`,
          {
            headers: { Authorization: `Bearer ${spotifyToken}` },
          }
        );

        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();

        const newItems = data.tracks.items;

        setHasMore(newItems.length === limit);

        if (offset === 0) {
          setSearchResults(newItems);
        } else {
          setSearchResults((prev) => [...prev, ...newItems]);
        }
      } catch (err) {
        console.error(err);
      }
    },
    [spotifyToken]
  );

  // 3. Search Effect (Debounced)
  useEffect(() => {
    if (!searchQuery.trim() || manualMode) {
      setSearchResults([]);
      setHasMore(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      await fetchTracks(searchQuery, 0);
      setIsSearching(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, manualMode, fetchTracks]);

  // 4. Infinite Scroll Handler
  const handleScroll = async (e) => {
    const { scrollTop, clientHeight, scrollHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      if (!isSearching && !isLoadingMore && hasMore && searchQuery) {
        setIsLoadingMore(true);
        await fetchTracks(searchQuery, searchResults.length);
        setIsLoadingMore(false);
      }
    }
  };

  // 5. Actions
  const addSong = (track) => {
    const isDuplicate = songs.some((s) => s.id === track.id);
    if (isDuplicate) {
      alert('이미 리스트에 존재하는 곡입니다!');
      return;
    }

    const newSong = {
      id: track.id || `manual-${Date.now()}`,
      title: track.name,
      artist: track.artists ? track.artists[0].name : track.artist,
      album: track.album ? track.album.name : track.albumName || '-',
      coverUrl: track.album && track.album.images?.[2]?.url,
      durationMs: track.duration_ms,
    };
    setSongs((items) => [...items, newSong]);

    setSearchResults([]);
    setSearchQuery('');
  };

  const addManualSong = () => {
    if (!manualForm.title) return;
    const durationMs =
      (manualForm.minutes * 60 + manualForm.seconds) * 1000;

    const manualId = `manual-${Date.now()}`;

    addSong({
      id: manualId,
      name: manualForm.title,
      artist: manualForm.artist,
      albumName: 'Manual Input',
      duration_ms: durationMs,
    });
    setManualMode(false);
    setManualForm({ title: '', artist: '', minutes: 0, seconds: 0 });
  };

  const removeSong = (id) => {
    setSongs(songs.filter((s) => s.id !== id));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setSongs((items) => {
        const oldIndex = items.findIndex(
          (item) => item.id === active.id
        );
        const newIndex = items.findIndex(
          (item) => item.id === over.id
        );
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // 6. Calculations
  const totalDurationMs = useMemo(
    () => songs.reduce((acc, song) => acc + song.durationMs, 0),
    [songs]
  );
  const targetDurationMs =
    (targetMinutes * 60 + targetSeconds) * 1000;
  const remainingMs = targetDurationMs - totalDurationMs;

  const isOver = remainingMs < 0;
  const absRemains = Math.abs(remainingMs);
  const isSevere = isOver && absRemains > 30000;

  // 7. Clipboard Copy
  // 7. Clipboard Copy
  const copyList = () => {
    if (songs.length === 0) {
      alert('리스트가 비어있습니다!');
      return;
    }

    const header = '🎵 이번 모임 주제곡 보내드립니다!\n\n';
    const body = songs
      .map(
        (s, index) =>
          `${index + 1}. ${s.artist} - ${s.title} (${formatTimeKorean(
            s.durationMs
          )})`
      )
      .join('\n');
    const footer = `\n\n총 ${formatTimeKorean(totalDurationMs)}`;

    const fullText = header + body + footer;
    setCopyText(fullText);
    setIsCopyModalOpen(true);
  };

  const handleRealCopy = () => {
    navigator.clipboard
      .writeText(copyText)
      .then(() => {
        alert('📋 메시지 내용이 복사되었습니다!');
        setIsCopyModalOpen(false);
      })
      .catch((err) => {
        console.error('Failed to copy: ', err);
      });
  };

  return (
    <>
      <GlobalStyles />
      <ThemeProvider theme={original}>
        <Wrapper>
          <StyledWindow className="window">
            <StyledWindowHeader>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Music size={16} /> 음악 시간 계산기.exe
              </span>
              <Button size="sm" square>
                <span
                  style={{
                    fontWeight: 'bold',
                    transform: 'translateY(-1px)',
                  }}
                >
                  X
                </span>
              </Button>
            </StyledWindowHeader>

            <WindowContent
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: '0.5rem',
              }}
            >
              {/* Top Controls */}
              <Panel
                variant="well"
                style={{
                  padding: '0.8rem',
                  marginBottom: '0.5rem',
                  background: 'white',
                }}
              >
                <div
                  style={{
                    marginBottom: '0.5rem',
                    fontWeight: 'bold',
                  }}
                >
                  ⏱️ 목표 시간 설정
                </div>
                <ResponsiveFlex
                  style={{
                    flexWrap: 'nowrap',
                    overflowX: 'auto',
                    paddingBottom: '5px',
                  }}
                >
                  {' '}
                  {/* Prevent wrapping */}
                  <CustomNumberInput
                    value={targetMinutes}
                    onChange={setTargetMinutes}
                    width={50}
                  />
                  <span style={{ flexShrink: 0 }}>분</span>
                  <CustomNumberInput
                    value={targetSeconds}
                    onChange={setTargetSeconds}
                    width={50}
                    max={59}
                  />
                  <span style={{ flexShrink: 0 }}>초</span>
                </ResponsiveFlex>
              </Panel>

              {/* Search / Manual Toggle Section */}
              <div
                style={{
                  position: 'relative',
                  marginBottom: '0.5rem',
                  zIndex: 100,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                  }}
                >
                  {!manualMode ? (
                    <div
                      style={{
                        flex: 1,
                        position: 'relative',
                        minWidth: '150px',
                      }}
                    >
                      <TextInput
                        value={searchQuery}
                        placeholder="🔍 노래 검색 (곡 제목, 아티스트)..."
                        onChange={(e) =>
                          setSearchQuery(e.target.value)
                        }
                        width="100%"
                        style={{ paddingRight: 30 }}
                      />
                      {isSearching && (
                        <div
                          style={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                          }}
                        >
                          ⌛
                        </div>
                      )}
                    </div>
                  ) : (
                    <ResponsiveFlex
                      style={{ flex: 1, width: '100%' }}
                    >
                      <TextInput
                        placeholder="곡 제목"
                        value={manualForm.title}
                        onChange={(e) =>
                          setManualForm({
                            ...manualForm,
                            title: e.target.value,
                          })
                        }
                        style={{ flex: 1, minWidth: '100px' }}
                      />
                      <TextInput
                        placeholder="아티스트"
                        value={manualForm.artist}
                        onChange={(e) =>
                          setManualForm({
                            ...manualForm,
                            artist: e.target.value,
                          })
                        }
                        style={{ flex: 1, minWidth: '70px' }}
                      />

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <CustomNumberInput
                          value={manualForm.minutes}
                          onChange={(v) =>
                            setManualForm({
                              ...manualForm,
                              minutes: v,
                            })
                          }
                          width={50}
                        />
                        <span>분</span>
                        <CustomNumberInput
                          value={manualForm.seconds}
                          onChange={(v) =>
                            setManualForm({
                              ...manualForm,
                              seconds: v,
                            })
                          }
                          width={50}
                          max={59}
                        />
                        <span>초</span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          gap: 5,
                          marginLeft: 'auto',
                        }}
                      >
                        <Button onClick={addManualSong}>입력</Button>
                        <Button onClick={() => setManualMode(false)}>
                          취소
                        </Button>
                      </div>
                    </ResponsiveFlex>
                  )}

                  {!manualMode && (
                    <Button
                      onClick={() => setManualMode(true)}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      직접 입력
                    </Button>
                  )}
                </div>

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <SearchResultDropdown onScroll={handleScroll}>
                    {searchResults.map((track) => (
                      <ResultItem
                        key={track.id}
                        onClick={() => addSong(track)}
                      >
                        {track.album.images.length > 0 && (
                          <img
                            src={track.album.images[2].url}
                            width={30}
                            height={30}
                            alt=""
                          />
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold' }}>
                            {track.name}
                          </div>
                          <div style={{ fontSize: '0.8em' }}>
                            {track.artists[0].name} -{' '}
                            {formatTime(track.duration_ms)}
                          </div>
                        </div>
                        {songs.some((s) => s.id === track.id) && (
                          <span
                            style={{
                              fontSize: '0.8em',
                              color: 'red',
                              fontWeight: 'bold',
                            }}
                          >
                            [추가됨]
                          </span>
                        )}
                      </ResultItem>
                    ))}
                    {isLoadingMore && (
                      <div
                        style={{
                          padding: '10px',
                          textAlign: 'center',
                          color: '#888',
                        }}
                      >
                        Loading more...
                      </div>
                    )}
                  </SearchResultDropdown>
                )}
              </div>

              {/* Compact Table Area */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  marginBottom: '1rem',
                  background: 'white',
                  border: '2px inset white',
                }}
              >
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <Table style={{ width: '100%' }}>
                    <TableHead>
                      <TableRow>
                        <SlimHeadCell style={{ width: 40 }}>
                          이동
                        </SlimHeadCell>
                        <SlimHeadCell>곡 정보</SlimHeadCell>
                        <SlimHeadCell
                          style={{ width: 50, textAlign: 'center' }}
                        >
                          시간
                        </SlimHeadCell>
                        <SlimHeadCell
                          style={{ width: 40, textAlign: 'center' }}
                        >
                          삭제
                        </SlimHeadCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <SortableContext
                        items={songs.map((s) => s.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {songs.map((song) => (
                          <SortableRow
                            key={song.id}
                            song={song}
                            onRemove={removeSong}
                            formatTime={formatTime}
                          />
                        ))}
                        {songs.length === 0 && (
                          <TableRow>
                            <TableDataCell
                              colSpan={4}
                              style={{
                                textAlign: 'center',
                                padding: '2rem',
                                color: '#666',
                              }}
                            >
                              <p
                                style={{
                                  marginBottom: 10,
                                  fontSize: '1.2em',
                                }}
                              >
                                💿 리스트가 비어있습니다.
                              </p>
                              <p>곡을 추가해주세요.</p>
                            </TableDataCell>
                          </TableRow>
                        )}
                      </SortableContext>
                    </TableBody>
                  </Table>
                </DndContext>
              </div>

              {/* Footer Status Panel */}
              <StatusPanel
                variant="well"
                $isOver={isOver}
                $isSevere={isSevere}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>
                    총: {formatTime(totalDurationMs)} /{' '}
                    {targetMinutes}:
                    {targetSeconds.toString().padStart(2, '0')}
                  </div>
                  <div
                    style={{ fontWeight: 'bold', fontSize: '1.1rem' }}
                  >
                    {isOver ? (
                      <span>
                        {isSevere ? '⚠️ ' : ''}
                        {Math.floor(absRemains / 1000)}초 초과!
                      </span>
                    ) : (
                      <span>남은 시간: {formatTime(absRemains)}</span>
                    )}
                  </div>
                </div>

                <Button
                  onClick={copyList}
                  style={{
                    display: 'flex',
                    gap: 5,
                    alignItems: 'center',
                  }}
                >
                  <Mail size={16} /> 메시지 작성
                </Button>
              </StatusPanel>
            </WindowContent>
          </StyledWindow>

          {/* Copy Modal */}
          {isCopyModalOpen && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0,0,0,0.4)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Window style={{ width: 350, maxWidth: '90%' }}>
                <WindowHeader
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <Mail size={16} /> 메시지 편집
                  </span>
                  <Button
                    onClick={() => setIsCopyModalOpen(false)}
                    size="sm"
                    square
                  >
                    <span
                      style={{
                        fontWeight: 'bold',
                        transform: 'translateY(-1px)',
                      }}
                    >
                      X
                    </span>
                  </Button>
                </WindowHeader>
                <WindowContent>
                  <p style={{ marginBottom: 10 }}>
                    복사하기 전에 내용을 수정할 수 있습니다:
                  </p>
                  <textarea
                    style={{
                      width: '100%',
                      height: 150,
                      marginBottom: 10,
                      fontFamily: 'ms_sans_serif',
                      padding: 5,
                      border: '2px solid #888',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                    }}
                    value={copyText}
                    onChange={(e) => setCopyText(e.target.value)}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 5,
                    }}
                  >
                    <Button onClick={() => setIsCopyModalOpen(false)}>
                      취소
                    </Button>
                    <Button onClick={handleRealCopy} primary>
                      복사하기
                    </Button>
                  </div>
                </WindowContent>
              </Window>
            </div>
          )}
        </Wrapper>
      </ThemeProvider>
    </>
  );
}
