export const fetchFipTournaments = async (supabaseClient) => {
  const { data, error } = await supabaseClient
    .from("international_fip_tournaments")
    .select("*");

  if (error) {
    throw error;
  }
  return data;
};

export const fetchNationalTournaments = async (country, supabaseWithAuth) => {
  const { data, error } = await supabaseWithAuth
    .from("national_tournaments")
    .select("*")
    .eq("country", country);

  if (error) {
    throw error;
  }
  return data;
};

export const fetchUserTournamentSelections = async (supabaseClient, userId) => {
  const { data, error } = await supabaseClient
    .from("user_tournament_selections")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
  return data;
};
