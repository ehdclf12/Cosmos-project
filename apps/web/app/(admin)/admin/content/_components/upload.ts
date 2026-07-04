import { createClient } from '@/lib/supabase/client'

export async function uploadLandingImage(file: File): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop()
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from('landing-images')
    .upload(path, file, { contentType: file.type })
  if (error) throw new Error(error.message)
  const { data: { publicUrl } } = supabase.storage.from('landing-images').getPublicUrl(path)
  return publicUrl
}
