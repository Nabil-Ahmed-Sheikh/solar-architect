import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import NotificationToast from "@/components/ui/NotificationToast";
import ProjectModal, { DeleteProjectModal } from "@/components/ui/ProjectModal";

interface AppShellProps {
  children: React.ReactNode;
  onGenerateDesign?: () => void;
}

export default function AppShell({ children, onGenerateDesign }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#f8fafb]">
      <Sidebar />
      <TopBar onGenerateDesign={onGenerateDesign} />
      <main className="ml-64 pt-16 p-8 min-h-screen">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>

      {/* Global UI overlays */}
      <NotificationToast />
      <ProjectModal />
      <DeleteProjectModal />
    </div>
  );
}
