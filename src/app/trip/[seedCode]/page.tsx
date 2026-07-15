import { PlantWorkspace } from "@/components/workspace/plant-workspace";

type PageProps = {
  params: Promise<{ seedCode: string }>;
  searchParams: Promise<{ guide?: string }>;
};

export default async function TripPage({ params, searchParams }: PageProps) {
  const { seedCode } = await params;
  const { guide } = await searchParams;
  return (
    <PlantWorkspace
      seedCode={seedCode.toUpperCase()}
      autoOpenGuide={guide === "1"}
    />
  );
}
