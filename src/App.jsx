import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
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
  NumberInput,
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
import { Trash2, GripVertical, Music } from 'lucide-react';

// --- Styled Components for Layout ---
const Wrapper = styled.div`
  padding: 1.5rem 1rem;
  display: flex;
  justify-content: center;
  min-height: 100vh;
  box-sizing: border-box;
  background: #008080;
`;

const StyledWindow = styled(Window)`
  width: 100%;
  max-width: 800px;
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

  // NO HOVER EFFECT AT ALL
`;

const StatusPanel = styled(Panel)`
  margin-top: auto;
  padding: 1rem;
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
`;

const ResponsiveFlex = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
`;

const TableContainer = styled.div`
  overflow-x: auto;
  margin-bottom: 1rem;

  &::-webkit-scrollbar {
    height: 12px;
  }
  &::-webkit-scrollbar-track {
    background: #dfdfdf;
  }
  &::-webkit-scrollbar-thumb {
    background: #c0c0c0;
    border: 2px solid;
    border-color: #ffffff #808080 #808080 #ffffff;
  }
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
  }
`;

// Global Rest
const GlobalStyles = createGlobalStyle`
  ${styleReset}
  body, input, select, textarea, button {
    font-family: 'ms_sans_serif' !important;
  }
`;

// Utility: Format Time
const formatTime = (ms) => {
  if (!ms && ms !== 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
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
      <TableDataCell style={{ width: '40px', padding: '0 5px' }}>
        <div
          {...listeners}
          style={{
            cursor: 'grab',
            display: 'flex',
            justifyContent: 'center',
            padding: '10px',
          }}
        >
          <GripVertical size={16} color="#888" />
        </div>
      </TableDataCell>
      <TableDataCell>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            minWidth: '120px',
          }}
        >
          {song.coverUrl ? (
            <img
              src={song.coverUrl}
              alt=""
              style={{
                width: 24,
                height: 24,
                border: '1px solid gray',
              }}
            />
          ) : (
            <Music size={16} />
          )}
          <span style={{ fontWeight: 'bold' }}>{song.title}</span>
        </div>
      </TableDataCell>
      <TableDataCell>{song.artist}</TableDataCell>
      <TableDataCell style={{ textAlign: 'center' }}>
        {formatTime(song.durationMs)}
      </TableDataCell>
      <TableDataCell style={{ textAlign: 'center' }}>
        <Button onClick={() => onRemove(song.id)} size="sm" square>
          <Trash2 size={14} />
        </Button>
      </TableDataCell>
    </NoHoverTableRow>
  );
}

export default function App() {
  // Settings
  const [targetMinutes, setTargetMinutes] = useState(22);
  const [targetSeconds, setTargetSeconds] = useState(0);

  // Data
  const [songs, setSongs] = useState([]);

  // Search Data
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false); // For infinite scroll
  const [hasMore, setHasMore] = useState(true); // Is there more data?
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
        const limit = 20; // Increase limit for better scrolling experience
        // UPDATED: Point to the new Vercel serverless function /api/search
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

        // Update hasMore based on whether we got a full page back
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

    // Reset results when query changes
    setIsSearching(true);
    const timer = setTimeout(async () => {
      await fetchTracks(searchQuery, 0);
      setIsSearching(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, manualMode, fetchTracks]); // fetchTracks is stable due to useCallback (partially, depends on token)

  // 4. Infinite Scroll Handler
  const handleScroll = async (e) => {
    const { scrollTop, clientHeight, scrollHeight } = e.target;
    // Check if scrolled near bottom
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
    // Duplicate Check
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

    // Clear search for better UX
    setSearchResults([]);
    setSearchQuery('');
  };

  const addManualSong = () => {
    if (!manualForm.title) return;
    const durationMs =
      (manualForm.minutes * 60 + manualForm.seconds) * 1000;

    // Create simple ID for manual song
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

  // DnD Handler
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
              }}
            >
              {/* Top Controls: Target Time */}
              <Panel
                variant="well"
                style={{
                  padding: '0.8rem',
                  marginBottom: '1rem',
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
                <ResponsiveFlex>
                  <NumberInput
                    value={targetMinutes}
                    onChange={(val) => setTargetMinutes(val)}
                    width={80}
                    min={0}
                  />
                  <span>분</span>
                  <NumberInput
                    value={targetSeconds}
                    onChange={(val) => setTargetSeconds(val)}
                    width={80}
                    min={0}
                    max={59}
                  />
                  <span>초</span>
                  <span
                    style={{
                      color: '#888',
                      fontSize: '0.8em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    (최대 +30초 허용)
                  </span>
                </ResponsiveFlex>
              </Panel>

              {/* Search / Manual Toggle Section */}
              <div
                style={{
                  position: 'relative',
                  marginBottom: '1rem',
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
                        minWidth: '200px',
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
                        style={{ flex: 1, minWidth: '150px' }}
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
                        style={{ flex: 1, minWidth: '100px' }}
                      />

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <NumberInput
                          value={manualForm.minutes}
                          onChange={(v) =>
                            setManualForm({
                              ...manualForm,
                              minutes: v,
                            })
                          }
                          width={70}
                          min={0}
                        />
                        <span>분</span>
                        <NumberInput
                          value={manualForm.seconds}
                          onChange={(v) =>
                            setManualForm({
                              ...manualForm,
                              seconds: v,
                            })
                          }
                          width={70}
                          min={0}
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

              {/* Table Area with auto scroll */}
              <TableContainer>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <Table style={{ minWidth: '500px' }}>
                    <TableHead>
                      <TableRow>
                        <TableHeadCell style={{ width: 50 }}>
                          이동
                        </TableHeadCell>
                        <TableHeadCell>곡 제목</TableHeadCell>
                        <TableHeadCell>아티스트</TableHeadCell>
                        <TableHeadCell
                          style={{ textAlign: 'center', width: 80 }}
                        >
                          시간
                        </TableHeadCell>
                        <TableHeadCell style={{ width: 60 }}>
                          삭제
                        </TableHeadCell>
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
                              colSpan={5}
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
                              <p>
                                위 검색창을 통해 곡을 추가하거나 '직접
                                입력' 메뉴를 사용하세요.
                              </p>
                            </TableDataCell>
                          </TableRow>
                        )}
                      </SortableContext>
                    </TableBody>
                  </Table>
                </DndContext>
              </TableContainer>

              {/* Footer Status Panel */}
              <StatusPanel
                variant="well"
                $isOver={isOver}
                $isSevere={isSevere}
              >
                <div style={{ fontWeight: 'bold' }}>
                  총 시간: {formatTime(totalDurationMs)} /{' '}
                  {targetMinutes}:
                  {targetSeconds.toString().padStart(2, '0')}
                </div>
                <div
                  style={{ fontWeight: 'bold', fontSize: '1.2rem' }}
                >
                  {isOver ? (
                    <span>
                      {isSevere ? '⚠️ ' : ''}
                      {Math.floor(absRemains / 1000)}초 초과!
                    </span>
                  ) : (
                    <span>남은: {formatTime(absRemains)}</span>
                  )}
                </div>
              </StatusPanel>
            </WindowContent>
          </StyledWindow>
        </Wrapper>
      </ThemeProvider>
    </>
  );
}
