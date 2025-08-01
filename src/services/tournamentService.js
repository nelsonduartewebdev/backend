export const fetchFipTournaments = async (supabaseClient) => {
  const { data, error } = await supabaseClient
    .from("international_fip_tournaments")
    .select("*");

  if (error) {
    throw error;
  }
  return data;
};
