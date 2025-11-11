// Add your Supabase credentials here
// You can find these in your Supabase project settings under API

export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
};

// Note: The anon key is safe to use in frontend code as it's a publishable key
// It only allows access based on your Row Level Security (RLS) policies
