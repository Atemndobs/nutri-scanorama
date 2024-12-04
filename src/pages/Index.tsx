import { Header } from "@/components/Header";
import { RecentScans } from "@/components/RecentScans";
import { UploadButton } from "@/components/UploadButton";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95">
      <Header />
      <main className="container max-w-md mx-auto p-4 space-y-6 animate-fadeIn">
        <UploadButton />
        <RecentScans />
      </main>
    </div>
  );
};

export default Index;