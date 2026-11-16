import { BrowserRouter, Routes, Route } from "react-router-dom";
import Kanban from "./components/editor/Kanban";
import { Toaster } from "sonner";

const App = () => {
  return (
    <>
      <Toaster position="bottom-center" richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Kanban />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

export default App;
