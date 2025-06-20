import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import '@fortawesome/fontawesome-free/css/all.min.css';
import "./App.css";
import EditorPage from "./pages/editor_page/editor_page";
import HomePage from './pages/home_page/home_page';
import RoomPage from './pages/room_page/room_page';
import { VideoProvider } from "./utils/video_context";
import { WebRTCProvider } from './utils/webRTC_context';

function App() {

  console.log('App component called');

  return (
    <Router>
      <VideoProvider>
        <WebRTCProvider>
          <Routes>
            <Route path="/" Component={HomePage} />
            <Route path="/room/:roomId" Component={RoomPage} />
            <Route path="/code-editor/:roomId" Component={EditorPage} />
          </Routes>
        </WebRTCProvider>
      </VideoProvider>
    </Router>
  );
}


export default App;