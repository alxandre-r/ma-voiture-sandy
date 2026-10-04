export interface UserPreferences {
  user_id: string;
  show_consumption: boolean;
  show_insurance: boolean;
  show_vehicle_details: boolean;
  show_financials: boolean;
  default_period: 'month' | 'year' | 'all';
  default_vehicle_scope: 'personal' | 'family' | 'all';
  created_at: string;
  updated_at: string;
}

/** The flags a family member may read about another member (get_family_visibility_prefs). */
export type FamilyVisibilityPrefs = Pick<
  UserPreferences,
  'show_consumption' | 'show_insurance' | 'show_vehicle_details' | 'show_financials'
>;
