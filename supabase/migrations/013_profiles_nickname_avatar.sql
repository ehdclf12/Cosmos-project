-- profiles에 nickname 컬럼 추가 (없는 경우)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname text;

-- 신규 가입/OAuth 모두 nickname, avatar_url 채우도록 트리거 업데이트
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_nickname text;
BEGIN
  -- 이메일 가입: raw_user_meta_data.nickname
  -- 카카오 로그인: raw_user_meta_data.full_name
  v_nickname := COALESCE(
    NEW.raw_user_meta_data->>'nickname',
    NEW.raw_user_meta_data->>'full_name'
  );

  INSERT INTO public.profiles (id, username, display_name, nickname, avatar_url, phone)
  VALUES (
    NEW.id,
    'user_' || substr(replace(NEW.id::text, '-', ''), 1, 8),
    COALESCE(v_nickname, '독자'),
    v_nickname,
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
