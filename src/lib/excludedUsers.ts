import { supabase } from '@/integrations/supabase/client';

// Mascot/fake account user IDs (hardcoded)
export const MASCOT_USER_IDS = new Set([
  // Mascot-based accounts
  'b1a2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', // Tornike
  'c2b3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', // Nino
  'd3c4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f', // Saba
  'e4d5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a', // Salome
  'f5e6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b', // Dato
  'a6f7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c', // Keti
  'b7a8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d', // Irakli
  'c8b9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2e', // Tekla
  '71eb3fac-ba7c-4e7e-8b5e-02a21323e76e', // Giorgi
  'dbf8dbc0-5e95-4870-8b47-a043ead0fb9f', // Nika
  '2574663a-d951-4475-9feb-60fef89caf9d', // Ana
  '7570d628-619b-434c-8d5c-fa6007eaa43f', // Luka
  '9b9330ae-740f-4b53-8e40-9202ce3660c9', // Elene
  // Photo-based fake accounts
  'a1b2c3d4-1111-4000-8000-000000000001', // levan_88
  'a1b2c3d4-2222-4000-8000-000000000002', // Natato
  'a1b2c3d4-3333-4000-8000-000000000003', // Elene_E
  'a1b2c3d4-4444-4000-8000-000000000004', // Sofia
  'a1b2c3d4-5555-4000-8000-000000000005', // LASH10
  'a1b2c3d4-6666-4000-8000-000000000006', // Nona_12
  'a1b2c3d4-7777-4000-8000-000000000007', // Grigoli_a
  'a1b2c3d4-8888-4000-8000-000000000008', // Kosta
  // Giga (7d75dfbb-...) removed — real user with 9 games and 11k coins
  // Mariam and Davit not found in DB
  // Test accounts
  'fb151184-10be-4496-b654-ffcf66de0536', // Mako
  'feccf29c-d308-4240-9086-853316321753', // Testera
  '750ad305-db5f-40bc-b8b3-1411c68024b8', // Lola
  '687e47bc-e90c-4252-95e2-61e3170a892d', // koka
]);

/** Fetch admin user IDs from user_roles table */
export async function fetchAdminUserIds(): Promise<Set<string>> {
  const { data } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin');
  return new Set((data || []).map(r => r.user_id));
}

/** Check if a user_id should be excluded from analytics */
export function isExcludedUser(userId: string, adminIds: Set<string>): boolean {
  return MASCOT_USER_IDS.has(userId) || adminIds.has(userId);
}
