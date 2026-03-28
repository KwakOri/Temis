

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."cleanup_expired_tokens"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DELETE FROM tokens 
    WHERE expires_at < NOW() 
    OR (used = TRUE AND created_at < NOW() - INTERVAL '7 days');
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_tokens"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_id"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (current_setting('request.jwt.claims', true)::json->>'user_id')::integer;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."get_current_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_portfolios_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_portfolios_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_template_access"("p_template_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- 1. 템플릿 소유자인지 확인
    IF EXISTS (
        SELECT 1 FROM public.templates 
        WHERE id = p_template_id AND created_by = p_user_id
    ) THEN
        RETURN true;
    END IF;
    
    -- 2. 공개 템플릿인지 확인
    IF EXISTS (
        SELECT 1 FROM public.templates 
        WHERE id = p_template_id AND is_public = true
    ) THEN
        RETURN true;
    END IF;
    
    -- 3. 명시적 접근 권한이 있는지 확인
    IF EXISTS (
        SELECT 1 FROM public.template_access 
        WHERE template_id = p_template_id AND user_id = p_user_id
    ) THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$;


ALTER FUNCTION "public"."has_template_access"("p_template_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_user"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_id INTEGER;
  user_email TEXT;
BEGIN
  user_id := get_current_user_id();
  
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT email INTO user_email FROM users WHERE id = user_id;
  
  -- 관리자 이메일 체크 (필요시 수정)
  RETURN user_email IN ('admin@temis.com', 'admin@example.com');
END;
$$;


ALTER FUNCTION "public"."is_admin_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_admin_options_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_admin_options_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_legacy_custom_orders_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_legacy_custom_orders_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_price_options_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_price_options_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_shop_templates_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_shop_templates_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_template_products_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_template_products_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_template_purchase_requests_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_template_purchase_requests_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "password" "text" NOT NULL,
    "twitter_access_token" "text",
    "twitter_access_token_secret" "text",
    "twitter_user_id" "text",
    "twitter_username" "text",
    "twitter_connected_at" timestamp without time zone,
    "role" character varying(20) DEFAULT 'user'::character varying,
    CONSTRAINT "users_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['user'::character varying, 'admin'::character varying, 'unauthorized'::character varying])::"text"[])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."twitter_access_token" IS 'Twitter OAuth 1.1 access token for API calls';



COMMENT ON COLUMN "public"."users"."twitter_access_token_secret" IS 'Twitter OAuth 1.1 access token secret';



COMMENT ON COLUMN "public"."users"."twitter_user_id" IS 'Twitter user ID for identification';



COMMENT ON COLUMN "public"."users"."twitter_username" IS 'Twitter username (handle) for display';



COMMENT ON COLUMN "public"."users"."twitter_connected_at" IS 'Timestamp when Twitter account was connected';



ALTER TABLE "public"."users" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."User_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."admin_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" character varying(100) NOT NULL,
    "label" character varying(255) NOT NULL,
    "value" character varying(255) NOT NULL,
    "description" "text",
    "price" integer DEFAULT 0 NOT NULL,
    "is_discount" boolean DEFAULT false NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "setting_key" character varying(50) NOT NULL,
    "setting_value" "jsonb" NOT NULL,
    "description" "text",
    "category" character varying(20) DEFAULT 'general'::character varying,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_tab_order" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tab_id" character varying NOT NULL,
    "order_index" integer NOT NULL,
    "is_visible" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_tab_id" CHECK ((("tab_id")::"text" = ANY ((ARRAY['workCalendar'::character varying, 'customOrders'::character varying, 'purchases'::character varying, 'templates'::character varying, 'thumbnails'::character varying, 'portfolios'::character varying, 'users'::character varying, 'teams'::character varying, 'teamTemplates'::character varying, 'emailPreview'::character varying, 'access'::character varying, 'settings'::character varying])::"text"[])))
);


ALTER TABLE "public"."admin_tab_order" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_tab_order" IS 'Stores the order and visibility of admin dashboard tabs';



COMMENT ON COLUMN "public"."admin_tab_order"."tab_id" IS 'Unique identifier for the tab (matches TabType)';



COMMENT ON COLUMN "public"."admin_tab_order"."order_index" IS 'Display order of the tab (0-based)';



COMMENT ON COLUMN "public"."admin_tab_order"."is_visible" IS 'Whether the tab should be displayed';



CREATE TABLE IF NOT EXISTS "public"."custom_timetable_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "youtube_sns_address" "text" NOT NULL,
    "email_discord" "text" NOT NULL,
    "order_requirements" "text" NOT NULL,
    "has_character_images" boolean DEFAULT false NOT NULL,
    "wants_omakase" boolean DEFAULT false NOT NULL,
    "design_keywords" "text",
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "admin_notes" "text",
    "price_quoted" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" bigint NOT NULL,
    "selected_options" "jsonb" DEFAULT '[]'::"jsonb",
    "depositor_name" "text",
    "deadline" "date",
    CONSTRAINT "custom_timetable_orders_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('pending'::character varying)::"text", ('accepted'::character varying)::"text", ('in_progress'::character varying)::"text", ('completed'::character varying)::"text", ('cancelled'::character varying)::"text"])))
);


ALTER TABLE "public"."custom_timetable_orders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."custom_timetable_orders"."depositor_name" IS '입금자명 (계좌 이체 시 사용하는 이름)';



COMMENT ON COLUMN "public"."custom_timetable_orders"."deadline" IS 'Expected completion date for the custom timetable order';



CREATE TABLE IF NOT EXISTS "public"."files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "file_key" character varying(512) NOT NULL,
    "original_name" character varying(255) NOT NULL,
    "file_size" bigint NOT NULL,
    "mime_type" character varying(100) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" bigint,
    "order_id" "uuid",
    "file_category" character varying(20),
    CONSTRAINT "files_file_category_check" CHECK ((("file_category")::"text" = ANY ((ARRAY['character_image'::character varying, 'reference'::character varying])::"text"[])))
);


ALTER TABLE "public"."files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."legacy_custom_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "nickname" character varying(100) NOT NULL,
    "status" character varying(20) NOT NULL,
    "deadline" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "legacy_custom_orders_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."legacy_custom_orders" OWNER TO "postgres";


COMMENT ON TABLE "public"."legacy_custom_orders" IS 'Temporary table for managing external orders during transitional period';



COMMENT ON COLUMN "public"."legacy_custom_orders"."email" IS 'Customer email address';



COMMENT ON COLUMN "public"."legacy_custom_orders"."nickname" IS 'Customer nickname or display name';



COMMENT ON COLUMN "public"."legacy_custom_orders"."status" IS 'Order processing status';



COMMENT ON COLUMN "public"."legacy_custom_orders"."deadline" IS 'Expected completion date';



CREATE TABLE IF NOT EXISTS "public"."portfolios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "thumbnail_url" "text" NOT NULL,
    "image_urls" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "created_by" integer
);


ALTER TABLE "public"."portfolios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."price_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" character varying(100) NOT NULL,
    "label" character varying(255) NOT NULL,
    "value" character varying(255) NOT NULL,
    "description" "text",
    "price" integer DEFAULT 0 NOT NULL,
    "is_discount" boolean DEFAULT false NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "order" bigint DEFAULT '0'::bigint NOT NULL
);


ALTER TABLE "public"."price_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchase_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid",
    "customer_name" "text" NOT NULL,
    "customer_email" "text" NOT NULL,
    "customer_phone" "text" NOT NULL,
    "message" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."purchase_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."relations_team_template_and_team" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_template_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."relations_team_template_and_team" OWNER TO "postgres";


COMMENT ON TABLE "public"."relations_team_template_and_team" IS 'Junction table linking team templates to teams (many-to-many relationship)';



COMMENT ON COLUMN "public"."relations_team_template_and_team"."team_template_id" IS 'Reference to team_templates table';



COMMENT ON COLUMN "public"."relations_team_template_and_team"."team_id" IS 'Reference to teams table';



CREATE TABLE IF NOT EXISTS "public"."shop_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid",
    "title" "text",
    "features" "text"[],
    "requirements" "text",
    "purchase_instructions" "text",
    "is_artist" boolean DEFAULT false,
    "is_memo" boolean DEFAULT false,
    "is_multi_schedule" boolean DEFAULT false,
    "is_guerrilla" boolean DEFAULT false,
    "is_offline_memo" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "detailed_description" "text",
    "is_shop_visible" boolean DEFAULT false
);


ALTER TABLE "public"."shop_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."shop_templates" IS 'Shop template product information - price is stored in template_plans table';



COMMENT ON COLUMN "public"."shop_templates"."template_id" IS 'Reference to the template this shop product is for';



COMMENT ON COLUMN "public"."shop_templates"."title" IS 'Product title displayed in shop';



COMMENT ON COLUMN "public"."shop_templates"."features" IS 'Array of feature descriptions';



COMMENT ON COLUMN "public"."shop_templates"."requirements" IS 'Product requirements or prerequisites';



COMMENT ON COLUMN "public"."shop_templates"."purchase_instructions" IS 'Instructions shown to customers during purchase';



COMMENT ON COLUMN "public"."shop_templates"."is_artist" IS 'Whether template includes artist feature';



COMMENT ON COLUMN "public"."shop_templates"."is_memo" IS 'Whether template includes memo feature';



COMMENT ON COLUMN "public"."shop_templates"."is_multi_schedule" IS 'Whether template includes multi-schedule feature';



COMMENT ON COLUMN "public"."shop_templates"."is_guerrilla" IS 'Whether template includes guerrilla feature';



COMMENT ON COLUMN "public"."shop_templates"."is_offline_memo" IS 'Whether template includes offline memo feature';



COMMENT ON COLUMN "public"."shop_templates"."detailed_description" IS 'Shop-specific detailed description (only used in shop pages)';



COMMENT ON COLUMN "public"."shop_templates"."is_shop_visible" IS 'Whether this product is visible in the shop (replaces templates.is_shop_visible)';



CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "user_id" integer NOT NULL,
    "role" character varying(20) DEFAULT 'member'::character varying,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "team_members_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['manager'::character varying, 'member'::character varying])::"text"[])))
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" integer NOT NULL,
    "week_start_date" "date" NOT NULL,
    "schedule_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."team_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "descriptions" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."team_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."team_templates" IS 'Stores team template definitions with name and descriptions';



COMMENT ON COLUMN "public"."team_templates"."name" IS 'Name of the team template';



COMMENT ON COLUMN "public"."team_templates"."descriptions" IS 'Detailed descriptions of the team template';



CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "created_by" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."template_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "access_level" character varying(50) DEFAULT 'read'::character varying NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" bigint NOT NULL,
    "granted_by" bigint NOT NULL,
    "template_plan_id" "uuid",
    CONSTRAINT "template_access_access_level_check" CHECK ((("access_level")::"text" = ANY ((ARRAY['read'::character varying, 'write'::character varying, 'admin'::character varying])::"text"[])))
);


ALTER TABLE "public"."template_access" OWNER TO "postgres";


COMMENT ON COLUMN "public"."template_access"."template_plan_id" IS 'Reference to the specific plan (lite/pro) that the user has access to';



CREATE TABLE IF NOT EXISTS "public"."template_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan" character varying(20) DEFAULT 'lite'::character varying NOT NULL,
    "is_artist" boolean DEFAULT false,
    "is_memo" boolean DEFAULT false,
    "is_multi_schedule" boolean DEFAULT false,
    "is_guerrilla" boolean DEFAULT false,
    "is_offline_memo" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "price" integer DEFAULT 0,
    "shop_template_id" "uuid" NOT NULL,
    CONSTRAINT "template_plans_plan_check" CHECK ((("plan")::"text" = ANY ((ARRAY['lite'::character varying, 'pro'::character varying])::"text"[])))
);


ALTER TABLE "public"."template_plans" OWNER TO "postgres";


COMMENT ON TABLE "public"."template_plans" IS 'Stores plan-specific information including price and features (lite and pro per template)';



COMMENT ON COLUMN "public"."template_plans"."plan" IS 'Plan type: lite or pro';



COMMENT ON COLUMN "public"."template_plans"."is_artist" IS 'Artist profile feature enabled';



COMMENT ON COLUMN "public"."template_plans"."is_memo" IS 'Memo feature enabled';



COMMENT ON COLUMN "public"."template_plans"."is_multi_schedule" IS 'Multiple schedule feature enabled';



COMMENT ON COLUMN "public"."template_plans"."is_guerrilla" IS 'Guerrilla schedule feature enabled';



COMMENT ON COLUMN "public"."template_plans"."is_offline_memo" IS 'Offline memo feature enabled';



COMMENT ON COLUMN "public"."template_plans"."price" IS 'Price for this plan (lite or pro)';



COMMENT ON COLUMN "public"."template_plans"."shop_template_id" IS 'References shop_templates - plans are tied to shop products';



CREATE TABLE IF NOT EXISTS "public"."template_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid",
    "price" integer NOT NULL,
    "features" "text"[],
    "requirements" "text",
    "title" character varying(255),
    "purchase_instructions" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."template_products" OWNER TO "postgres";


COMMENT ON TABLE "public"."template_products" IS 'Stores product information for templates (one per template)';



COMMENT ON COLUMN "public"."template_products"."title" IS '상품명';



COMMENT ON COLUMN "public"."template_products"."purchase_instructions" IS '구매 안내사항';



CREATE TABLE IF NOT EXISTS "public"."template_purchase_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "user_id" integer NOT NULL,
    "customer_phone" "text",
    "message" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "plan_id" "uuid",
    "depositor_name" "text",
    CONSTRAINT "template_purchase_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."template_purchase_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."template_purchase_requests" IS 'Template purchase requests with user reference and plan selection';



COMMENT ON COLUMN "public"."template_purchase_requests"."template_id" IS 'Reference to the template being purchased';



COMMENT ON COLUMN "public"."template_purchase_requests"."user_id" IS 'Reference to the user making the purchase request';



COMMENT ON COLUMN "public"."template_purchase_requests"."customer_phone" IS 'Customer phone number (optional)';



COMMENT ON COLUMN "public"."template_purchase_requests"."message" IS 'Customer message or special requests';



COMMENT ON COLUMN "public"."template_purchase_requests"."status" IS 'Request status: pending, approved, rejected, completed';



CREATE TABLE IF NOT EXISTS "public"."templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "thumbnail_url" "text" DEFAULT ''::"text" NOT NULL,
    "is_public" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "detailed_description" "text",
    "is_shop_visible" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."templates" OWNER TO "postgres";


COMMENT ON COLUMN "public"."templates"."detailed_description" IS '템플릿 상세 설명 (HTML 포함 가능)';



COMMENT ON COLUMN "public"."templates"."is_shop_visible" IS '상점에서 노출 여부 (공개 템플릿만 해당)';



CREATE TABLE IF NOT EXISTS "public"."thumbnails" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "thumbnail_url" "text" DEFAULT ''::"text" NOT NULL,
    "is_public" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "detailed_description" "text",
    "is_shop_visible" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."thumbnails" OWNER TO "postgres";


COMMENT ON TABLE "public"."thumbnails" IS 'Stores thumbnail template information';



COMMENT ON COLUMN "public"."thumbnails"."detailed_description" IS '썸네일 상세 설명 (HTML 포함 가능)';



COMMENT ON COLUMN "public"."thumbnails"."is_shop_visible" IS '상점에서 노출 여부 (공개 썸네일만 해당)';



CREATE TABLE IF NOT EXISTS "public"."tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "token" character varying(255) NOT NULL,
    "type" character varying(20) NOT NULL,
    "user_id" integer,
    "expires_at" timestamp without time zone NOT NULL,
    "used" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "tokens_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['password_reset'::character varying, 'signup_invite'::character varying, 'email_verification'::character varying])::"text"[])))
);


ALTER TABLE "public"."tokens" OWNER TO "postgres";


ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_options"
    ADD CONSTRAINT "admin_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_settings"
    ADD CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_settings"
    ADD CONSTRAINT "admin_settings_setting_key_key" UNIQUE ("setting_key");



ALTER TABLE ONLY "public"."admin_tab_order"
    ADD CONSTRAINT "admin_tab_order_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_tab_order"
    ADD CONSTRAINT "admin_tab_order_tab_id_key" UNIQUE ("tab_id");



ALTER TABLE ONLY "public"."custom_timetable_orders"
    ADD CONSTRAINT "custom_timetable_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."files"
    ADD CONSTRAINT "files_file_key_key" UNIQUE ("file_key");



ALTER TABLE ONLY "public"."files"
    ADD CONSTRAINT "files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."legacy_custom_orders"
    ADD CONSTRAINT "legacy_custom_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portfolios"
    ADD CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."price_options"
    ADD CONSTRAINT "price_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_requests"
    ADD CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."relations_team_template_and_team"
    ADD CONSTRAINT "relations_team_template_and_team_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."relations_team_template_and_team"
    ADD CONSTRAINT "relations_team_template_and_team_team_template_id_team_id_key" UNIQUE ("team_template_id", "team_id");



ALTER TABLE ONLY "public"."shop_templates"
    ADD CONSTRAINT "shop_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_user_id_key" UNIQUE ("team_id", "user_id");



ALTER TABLE ONLY "public"."team_schedules"
    ADD CONSTRAINT "team_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_schedules"
    ADD CONSTRAINT "team_schedules_user_week_unique" UNIQUE ("user_id", "week_start_date");



ALTER TABLE ONLY "public"."team_templates"
    ADD CONSTRAINT "team_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_access"
    ADD CONSTRAINT "template_access_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_plans"
    ADD CONSTRAINT "template_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_products"
    ADD CONSTRAINT "template_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_purchase_requests"
    ADD CONSTRAINT "template_purchase_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."thumbnails"
    ADD CONSTRAINT "thumbnails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tokens"
    ADD CONSTRAINT "tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tokens"
    ADD CONSTRAINT "tokens_token_key" UNIQUE ("token");



CREATE INDEX "idx_admin_options_category" ON "public"."admin_options" USING "btree" ("category");



CREATE INDEX "idx_admin_options_is_enabled" ON "public"."admin_options" USING "btree" ("is_enabled");



CREATE INDEX "idx_admin_options_value" ON "public"."admin_options" USING "btree" ("value");



CREATE INDEX "idx_admin_settings_active" ON "public"."admin_settings" USING "btree" ("is_active");



CREATE INDEX "idx_admin_settings_category" ON "public"."admin_settings" USING "btree" ("category");



CREATE INDEX "idx_admin_settings_key" ON "public"."admin_settings" USING "btree" ("setting_key");



CREATE INDEX "idx_admin_tab_order_order_index" ON "public"."admin_tab_order" USING "btree" ("order_index");



CREATE INDEX "idx_custom_orders_created_at" ON "public"."custom_timetable_orders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_custom_orders_status" ON "public"."custom_timetable_orders" USING "btree" ("status");



CREATE INDEX "idx_files_created_at" ON "public"."files" USING "btree" ("created_at");



CREATE INDEX "idx_files_created_by" ON "public"."files" USING "btree" ("created_by");



CREATE INDEX "idx_files_file_key" ON "public"."files" USING "btree" ("file_key");



CREATE INDEX "idx_files_order_id" ON "public"."files" USING "btree" ("order_id");



CREATE INDEX "idx_files_order_id_category" ON "public"."files" USING "btree" ("order_id", "file_category");



CREATE INDEX "idx_portfolios_category" ON "public"."portfolios" USING "btree" ("category");



CREATE INDEX "idx_portfolios_created_at" ON "public"."portfolios" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_price_options_category" ON "public"."price_options" USING "btree" ("category");



CREATE INDEX "idx_price_options_enabled" ON "public"."price_options" USING "btree" ("is_enabled");



CREATE INDEX "idx_relations_team_id" ON "public"."relations_team_template_and_team" USING "btree" ("team_id");



CREATE INDEX "idx_relations_team_template_id" ON "public"."relations_team_template_and_team" USING "btree" ("team_template_id");



CREATE INDEX "idx_shop_templates_created_at" ON "public"."shop_templates" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_shop_templates_is_shop_visible" ON "public"."shop_templates" USING "btree" ("is_shop_visible") WHERE ("is_shop_visible" = true);



CREATE INDEX "idx_shop_templates_template_id" ON "public"."shop_templates" USING "btree" ("template_id");



CREATE INDEX "idx_team_members_team_id" ON "public"."team_members" USING "btree" ("team_id");



CREATE INDEX "idx_team_members_user_id" ON "public"."team_members" USING "btree" ("user_id");



CREATE INDEX "idx_team_schedules_user_id" ON "public"."team_schedules" USING "btree" ("user_id");



CREATE INDEX "idx_team_schedules_week_start" ON "public"."team_schedules" USING "btree" ("week_start_date");



CREATE INDEX "idx_teams_created_by" ON "public"."teams" USING "btree" ("created_by");



CREATE INDEX "idx_template_access_template_id" ON "public"."template_access" USING "btree" ("template_id");



CREATE INDEX "idx_template_access_template_plan_id" ON "public"."template_access" USING "btree" ("template_plan_id");



CREATE INDEX "idx_template_plans_plan" ON "public"."template_plans" USING "btree" ("plan");



CREATE INDEX "idx_template_plans_shop_template_id" ON "public"."template_plans" USING "btree" ("shop_template_id");



CREATE UNIQUE INDEX "idx_template_products_template_id" ON "public"."template_products" USING "btree" ("template_id");



CREATE INDEX "idx_template_purchase_requests_created_at" ON "public"."template_purchase_requests" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_template_purchase_requests_status" ON "public"."template_purchase_requests" USING "btree" ("status");



CREATE INDEX "idx_template_purchase_requests_template_id" ON "public"."template_purchase_requests" USING "btree" ("template_id");



CREATE INDEX "idx_template_purchase_requests_user_id" ON "public"."template_purchase_requests" USING "btree" ("user_id");



CREATE INDEX "idx_templates_is_public" ON "public"."templates" USING "btree" ("is_public");



CREATE INDEX "idx_thumbnails_created_at" ON "public"."thumbnails" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_thumbnails_is_public" ON "public"."thumbnails" USING "btree" ("is_public");



CREATE INDEX "idx_thumbnails_is_shop_visible" ON "public"."thumbnails" USING "btree" ("is_shop_visible");



CREATE INDEX "idx_tokens_email" ON "public"."tokens" USING "btree" ("email");



CREATE INDEX "idx_tokens_expires_at" ON "public"."tokens" USING "btree" ("expires_at");



CREATE INDEX "idx_tokens_token" ON "public"."tokens" USING "btree" ("token");



CREATE INDEX "idx_tokens_type" ON "public"."tokens" USING "btree" ("type");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_email_role" ON "public"."users" USING "btree" ("email", "role");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE INDEX "idx_users_twitter_connected_at" ON "public"."users" USING "btree" ("twitter_connected_at");



CREATE INDEX "idx_users_twitter_user_id" ON "public"."users" USING "btree" ("twitter_user_id");



CREATE OR REPLACE TRIGGER "legacy_custom_orders_updated_at_trigger" BEFORE UPDATE ON "public"."legacy_custom_orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_legacy_custom_orders_updated_at"();



CREATE OR REPLACE TRIGGER "set_portfolios_updated_at" BEFORE UPDATE ON "public"."portfolios" FOR EACH ROW EXECUTE FUNCTION "public"."handle_portfolios_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_shop_templates_updated_at" BEFORE UPDATE ON "public"."shop_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_shop_templates_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_admin_options_updated_at" BEFORE UPDATE ON "public"."admin_options" FOR EACH ROW EXECUTE FUNCTION "public"."update_admin_options_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_price_options_updated_at" BEFORE UPDATE ON "public"."price_options" FOR EACH ROW EXECUTE FUNCTION "public"."update_price_options_updated_at"();



CREATE OR REPLACE TRIGGER "update_admin_settings_updated_at" BEFORE UPDATE ON "public"."admin_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_custom_timetable_orders_updated_at" BEFORE UPDATE ON "public"."custom_timetable_orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_team_members_updated_at" BEFORE UPDATE ON "public"."team_members" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_team_schedules_updated_at" BEFORE UPDATE ON "public"."team_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_teams_updated_at" BEFORE UPDATE ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_template_products_updated_at" BEFORE UPDATE ON "public"."template_products" FOR EACH ROW EXECUTE FUNCTION "public"."update_template_products_updated_at"();



CREATE OR REPLACE TRIGGER "update_template_purchase_requests_updated_at" BEFORE UPDATE ON "public"."template_purchase_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_template_purchase_requests_updated_at"();



CREATE OR REPLACE TRIGGER "update_templates_updated_at" BEFORE UPDATE ON "public"."templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."custom_timetable_orders"
    ADD CONSTRAINT "custom_timetable_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."files"
    ADD CONSTRAINT "files_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."files"
    ADD CONSTRAINT "files_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."custom_timetable_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_plans"
    ADD CONSTRAINT "fk_template_plans_shop_template" FOREIGN KEY ("shop_template_id") REFERENCES "public"."shop_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."portfolios"
    ADD CONSTRAINT "portfolios_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."purchase_requests"
    ADD CONSTRAINT "purchase_requests_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id");



ALTER TABLE ONLY "public"."relations_team_template_and_team"
    ADD CONSTRAINT "relations_team_template_and_team_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."relations_team_template_and_team"
    ADD CONSTRAINT "relations_team_template_and_team_team_template_id_fkey" FOREIGN KEY ("team_template_id") REFERENCES "public"."team_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shop_templates"
    ADD CONSTRAINT "shop_templates_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_schedules"
    ADD CONSTRAINT "team_schedules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_access"
    ADD CONSTRAINT "template_access_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_access"
    ADD CONSTRAINT "template_access_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_access"
    ADD CONSTRAINT "template_access_template_plan_id_fkey" FOREIGN KEY ("template_plan_id") REFERENCES "public"."template_plans"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."template_access"
    ADD CONSTRAINT "template_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_products"
    ADD CONSTRAINT "template_products_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id");



ALTER TABLE ONLY "public"."template_purchase_requests"
    ADD CONSTRAINT "template_purchase_requests_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."template_plans"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."template_purchase_requests"
    ADD CONSTRAINT "template_purchase_requests_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_purchase_requests"
    ADD CONSTRAINT "template_purchase_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tokens"
    ADD CONSTRAINT "tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



CREATE POLICY "check_isMember" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "template_access_delete_policy" ON "public"."template_access" FOR DELETE USING ("public"."is_admin_user"());



CREATE POLICY "template_access_insert_policy" ON "public"."template_access" FOR INSERT WITH CHECK ("public"."is_admin_user"());



CREATE POLICY "template_access_select_policy" ON "public"."template_access" FOR SELECT USING ("public"."is_admin_user"());



CREATE POLICY "template_access_update_policy" ON "public"."template_access" FOR UPDATE USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



CREATE POLICY "templates_delete_policy" ON "public"."templates" FOR DELETE USING ("public"."is_admin_user"());



CREATE POLICY "templates_insert_policy" ON "public"."templates" FOR INSERT WITH CHECK ("public"."is_admin_user"());



CREATE POLICY "templates_select_policy" ON "public"."templates" FOR SELECT USING ((("is_public" = true) OR "public"."is_admin_user"()));



CREATE POLICY "templates_update_policy" ON "public"."templates" FOR UPDATE USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



CREATE POLICY "users_insert_policy" ON "public"."users" FOR INSERT WITH CHECK (true);



CREATE POLICY "users_policy" ON "public"."users" USING ((("id" = "public"."get_current_user_id"()) OR "public"."is_admin_user"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."cleanup_expired_tokens"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_tokens"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_tokens"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_portfolios_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_portfolios_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_portfolios_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_template_access"("p_template_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_template_access"("p_template_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_template_access"("p_template_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_admin_options_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_admin_options_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_admin_options_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_legacy_custom_orders_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_legacy_custom_orders_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_legacy_custom_orders_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_price_options_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_price_options_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_price_options_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_shop_templates_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_shop_templates_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_shop_templates_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_template_products_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_template_products_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_template_products_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_template_purchase_requests_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_template_purchase_requests_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_template_purchase_requests_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON SEQUENCE "public"."User_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."User_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."User_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."admin_options" TO "anon";
GRANT ALL ON TABLE "public"."admin_options" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_options" TO "service_role";



GRANT ALL ON TABLE "public"."admin_settings" TO "anon";
GRANT ALL ON TABLE "public"."admin_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_settings" TO "service_role";



GRANT ALL ON TABLE "public"."admin_tab_order" TO "anon";
GRANT ALL ON TABLE "public"."admin_tab_order" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_tab_order" TO "service_role";



GRANT ALL ON TABLE "public"."custom_timetable_orders" TO "anon";
GRANT ALL ON TABLE "public"."custom_timetable_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_timetable_orders" TO "service_role";



GRANT ALL ON TABLE "public"."files" TO "anon";
GRANT ALL ON TABLE "public"."files" TO "authenticated";
GRANT ALL ON TABLE "public"."files" TO "service_role";



GRANT ALL ON TABLE "public"."legacy_custom_orders" TO "anon";
GRANT ALL ON TABLE "public"."legacy_custom_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."legacy_custom_orders" TO "service_role";



GRANT ALL ON TABLE "public"."portfolios" TO "anon";
GRANT ALL ON TABLE "public"."portfolios" TO "authenticated";
GRANT ALL ON TABLE "public"."portfolios" TO "service_role";



GRANT ALL ON TABLE "public"."price_options" TO "anon";
GRANT ALL ON TABLE "public"."price_options" TO "authenticated";
GRANT ALL ON TABLE "public"."price_options" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_requests" TO "anon";
GRANT ALL ON TABLE "public"."purchase_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_requests" TO "service_role";



GRANT ALL ON TABLE "public"."relations_team_template_and_team" TO "anon";
GRANT ALL ON TABLE "public"."relations_team_template_and_team" TO "authenticated";
GRANT ALL ON TABLE "public"."relations_team_template_and_team" TO "service_role";



GRANT ALL ON TABLE "public"."shop_templates" TO "anon";
GRANT ALL ON TABLE "public"."shop_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."shop_templates" TO "service_role";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";



GRANT ALL ON TABLE "public"."team_schedules" TO "anon";
GRANT ALL ON TABLE "public"."team_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."team_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."team_templates" TO "anon";
GRANT ALL ON TABLE "public"."team_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."team_templates" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."template_access" TO "anon";
GRANT ALL ON TABLE "public"."template_access" TO "authenticated";
GRANT ALL ON TABLE "public"."template_access" TO "service_role";



GRANT ALL ON TABLE "public"."template_plans" TO "anon";
GRANT ALL ON TABLE "public"."template_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."template_plans" TO "service_role";



GRANT ALL ON TABLE "public"."template_products" TO "anon";
GRANT ALL ON TABLE "public"."template_products" TO "authenticated";
GRANT ALL ON TABLE "public"."template_products" TO "service_role";



GRANT ALL ON TABLE "public"."template_purchase_requests" TO "anon";
GRANT ALL ON TABLE "public"."template_purchase_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."template_purchase_requests" TO "service_role";



GRANT ALL ON TABLE "public"."templates" TO "anon";
GRANT ALL ON TABLE "public"."templates" TO "authenticated";
GRANT ALL ON TABLE "public"."templates" TO "service_role";



GRANT ALL ON TABLE "public"."thumbnails" TO "anon";
GRANT ALL ON TABLE "public"."thumbnails" TO "authenticated";
GRANT ALL ON TABLE "public"."thumbnails" TO "service_role";



GRANT ALL ON TABLE "public"."tokens" TO "anon";
GRANT ALL ON TABLE "public"."tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."tokens" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























