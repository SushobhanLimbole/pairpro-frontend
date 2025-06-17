import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import '@fortawesome/fontawesome-free/css/all.min.css';
import "./App.css";
import EditorPage from "./pages/editor_page/editor_page";
import HomePage from './pages/home_page/home_page';
import RoomPage from './pages/room_page/room_page';
import { VideoProvider } from './components/video_context/video_context';

function App() {

  return (
    <Router>
      <VideoProvider>
        <Routes>
          <Route path="/" Component={HomePage} />
          <Route path="/room/:roomId" Component={RoomPage} />
          <Route path="/code-editor/:roomId" Component={EditorPage} />
        </Routes>
      </VideoProvider>
    </Router>
  );
}

export default App;