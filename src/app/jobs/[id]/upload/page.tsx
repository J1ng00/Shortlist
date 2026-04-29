import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function UploadCandidatePage({ params }: Props) {
  const { id } = await params;
  redirect(`/apply/${id}`);
}
