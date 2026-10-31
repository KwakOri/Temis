import { supabaseAdminServer } from "../../src/lib/supabase-admin-server";

const findTemisArtistId = async (): Promise<string> => {
  const { data, error } = await supabaseAdminServer
    .from("artists")
    .select("id, slug, created_at")
    .or("slug.eq.temis,name.eq.테미스");
  if (error) throw error;

  // 마이그레이션과 같은 우선순위다. slug가 temis인 작가를 먼저, 그다음 오래된 순.
  const [artist] = [...(data ?? [])].sort(
    (a, b) =>
      Number(b.slug === "temis") - Number(a.slug === "temis") ||
      a.created_at.localeCompare(b.created_at),
  );
  if (!artist) {
    throw new Error(
      "테미스 시스템 작가가 없습니다. 마이그레이션을 먼저 적용하세요.",
    );
  }
  return artist.id;
};

let temisArtistIdPromise: Promise<string> | null = null;

/**
 * 테미스 시스템 작가 id를 찾는다.
 *
 * id를 고정해 두면 운영 DB를 복제한 로컬 DB에서만 통과한다. 마이그레이션만 적용한
 * 빈 DB(CI)에서는 마이그레이션이 테미스 작가를 새 id로 만들어서, 고정 id로
 * template_artists를 넣으면 FK 위반으로 실패한다. 그래서
 * `20260401000000_remove_no_artist_and_default_to_temis.sql`과 같은 기준으로 찾는다.
 *
 * fixture를 여러 개 동시에 만들 때 한 번만 조회하도록 결과를 기억한다.
 */
const resolveTemisArtistId = (): Promise<string> => {
  temisArtistIdPromise ??= findTemisArtistId();
  return temisArtistIdPromise;
};

/**
 * fixture 템플릿에 테미스 작가를 연결하고, 그 템플릿 전용 로열티 규칙을 만든다.
 *
 * 판매 준비 판정은 연결된 작가마다 로열티 규칙(작가 기본값이나 템플릿 전용)을
 * 요구한다. 운영 복제 DB의 테미스 작가에는 기본 규칙(100%)이 있지만 빈 DB에는
 * 없어서, 연결만 하면 ready여야 할 fixture가 ROYALTY_MISSING이 된다. 템플릿 전용
 * 규칙은 템플릿을 지우면 함께 지워지므로 정리할 대상이 늘지 않는다.
 */
export const linkTemisArtistToFixture = async (
  templateId: string,
): Promise<void> => {
  const artistId = await resolveTemisArtistId();

  const { error: linkError } = await supabaseAdminServer
    .from("template_artists")
    .insert({
      template_id: templateId,
      artist_id: artistId,
      role: "creator",
      is_primary: true,
      display_order: 0,
    });
  if (linkError) throw linkError;

  const { error: royaltyError } = await supabaseAdminServer
    .from("artist_royalty_rules")
    .insert({
      artist_id: artistId,
      template_id: templateId,
      royalty_type: "percentage",
      royalty_value: 100,
    });
  if (royaltyError) throw royaltyError;
};
