import { jobProfileDraftContract } from "@/lib/ai-json-contracts";
import { findCompanyMatches, researchCompany, type CompanySearchResult } from "@/lib/company-research";
import { generateJobProfileDraft, type JobGenerationInput } from "@/lib/job-ai";

export async function POST(request: Request) {
  const input = (await request.json()) as JobGenerationInput & {
    mode?: "lookup" | "generate";
    selected_company?: CompanySearchResult | null;
  };

  if (input.mode === "lookup") {
    const matches = await findCompanyMatches(input.business_name, input.location);

    return Response.json({
      matches
    });
  }

  const companyContext = input.selected_company ? await researchCompany(input.selected_company) : null;
  const data = await generateJobProfileDraft({
    business_name: input.business_name,
    role_title: input.role_title,
    location: input.location,
    work_type: input.work_type,
    company_context: companyContext
  });

  return Response.json({
    contract: jobProfileDraftContract,
    data,
    company_context: companyContext
      ? {
          name: companyContext.name,
          url: companyContext.url,
          scraped_urls: companyContext.scrapedUrls
        }
      : null
  });
}
