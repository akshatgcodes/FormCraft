import { Route, Routes } from "react-router-dom";
import RequireOwner from "./components/RequireOwner";
import FormsList from "./pages/FormsList";
import Builder from "./pages/Builder";
import Responses from "./pages/Responses";
import FillForm from "./pages/FillForm";

export default function App() {
  return (
    <Routes>
      <Route path="/f/:slug" element={<FillForm />} />
      <Route element={<RequireOwner />}>
        <Route path="/" element={<FormsList />} />
        <Route path="/forms/:id/edit" element={<Builder />} />
        <Route path="/forms/:id/responses" element={<Responses />} />
      </Route>
    </Routes>
  );
}
