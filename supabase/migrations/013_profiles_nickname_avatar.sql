-- profiles에 nickname 컬럼 추가 (nullable로 먼저 추가)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname text;

-- 기존 데이터 백필: auth.users의 메타데이터에서 nickname 채우기
UPDATE public.profiles p
SET
  nickname = COALESCE(
    u.raw_user_meta_data->>'nickname',
    u.raw_user_meta_data->>'full_name',
    p.display_name
  ),
  avatar_url = COALESCE(
    p.avatar_url,
    u.raw_user_meta_data->>'avatar_url'
  )
FROM auth.users u
WHERE p.id = u.id;

-- 백필 후 NOT NULL 제약 추가
ALTER TABLE public.profiles
  ALTER COLUMN nickname SET NOT NULL;

-- 신규 가입/OAuth 모두 nickname, avatar_url 채우도록 트리거 업데이트
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_nickname text;
BEGIN
  v_nickname := COALESCE(
    NEW.raw_user_meta_data->>'nickname',
    NEW.raw_user_meta_data->>'full_name',
    '독자'
  );

  INSERT INTO public.profiles (id, username, display_name, nickname, avatar_url, phone)
  VALUES (
    NEW.id,
    'user_' || substr(replace(NEW.id::text, '-', ''), 1, 8),
    v_nickname,
    v_nickname,
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
