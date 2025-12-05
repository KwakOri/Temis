import { supabase } from "@/lib/supabase";
import { Portfolio } from "@/types/portfolio";

/**
 * 모든 포트폴리오 조회
 */
export async function getAllPortfolios(): Promise<Portfolio[]> {

  const { data, error } = await supabase
    .from("portfolios")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching portfolios:", error);
    throw new Error("Failed to fetch portfolios");
  }

  return data || [];
}

/**
 * 특정 포트폴리오 조회
 */
export async function getPortfolioById(id: string): Promise<Portfolio | null> {
  const { data, error } = await supabase
    .from("portfolios")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching portfolio:", error);
    return null;
  }

  return data;
}

/**
 * 포트폴리오 생성
 */
export async function createPortfolio(
  category: string,
  title: string,
  description: string,
  thumbnailUrl: string,
  imageUrls: string[],
  userId: number
): Promise<Portfolio> {
  const { data, error } = await supabase
    .from("portfolios")
    .insert({
      category,
      title,
      description,
      thumbnail_url: thumbnailUrl,
      image_urls: imageUrls,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating portfolio:", error);
    throw new Error("Failed to create portfolio");
  }

  return data;
}

/**
 * 포트폴리오 수정
 */
export async function updatePortfolio(
  id: string,
  category: string,
  title: string,
  description: string,
  thumbnailUrl: string,
  imageUrls: string[]
): Promise<Portfolio> {
  const { data, error } = await supabase
    .from("portfolios")
    .update({
      category,
      title,
      description,
      thumbnail_url: thumbnailUrl,
      image_urls: imageUrls,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating portfolio:", error);
    throw new Error("Failed to update portfolio");
  }

  return data;
}

/**
 * 포트폴리오 삭제
 */
export async function deletePortfolio(id: string): Promise<void> {
  const { error } = await supabase.from("portfolios").delete().eq("id", id);

  if (error) {
    console.error("Error deleting portfolio:", error);
    throw new Error("Failed to delete portfolio");
  }
}
