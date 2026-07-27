import { BrowserRouter } from "react-router";
import { DataProvider } from "../data/DataProvider";
import { mockRepository } from "../data/mock/mockRepository";
import { AppRoutes } from "./routes";

export function App() {
  return (
    <DataProvider repository={mockRepository}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AppRoutes />
      </BrowserRouter>
    </DataProvider>
  );
}
