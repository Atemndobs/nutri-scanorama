import { RecentScans } from "@/components/RecentScans";
import { TopCategories } from "@/components/TopCategories";
import { UploadButton } from "@/components/UploadButton";
import { ScannedItemsPreview } from "@/components/ScannedItemsPreview";

const Index = () => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <TopCategories />
      <UploadButton />
      <RecentScans />
      <ScannedItemsPreview />
    </div>
  );
};

export default Index;