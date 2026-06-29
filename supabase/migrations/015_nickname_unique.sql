-- nickname unique 제약 추가
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_nickname_unique UNIQUE (nickname);

-- 카카오 등 OAuth 가입 시 닉네임 중복이면 숫자 접미사 붙여서 처리
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_nickname text;
  v_final_nickname text;
  v_attempt int := 0;
BEGIN
  v_nickname := COALESCE(
    NEW.raw_user_meta_data->>'nickname',
    NEW.raw_user_meta_data->>'full_name',
    '독자'
  );
  v_final_nickname := v_nickname;

  LOOP
    BEGIN
      INSERT INTO public.profiles (id, username, display_name, nickname, avatar_url, phone)
      VALUES (
        NEW.id,
        'user_' || substr(replace(NEW.id::text, '-', ''), 1, 8),
        v_final_nickname,
        v_final_nickname,
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'phone'
      );
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_attempt := v_attempt + 1;
      v_final_nickname := v_nickname || v_attempt::text;
    END;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
