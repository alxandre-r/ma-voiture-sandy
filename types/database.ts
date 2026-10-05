// Generated from the live Supabase project (upskwbjxrzykgtanqxsp) on 2026-10-05 with the
// Supabase MCP generate_typescript_types. Do not edit the Database type by hand: regenerate it after
// a schema change. The helpers at the bottom are simplified to the public schema.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      attachments: {
        Row: {
          category: string | null;
          created_at: string;
          entity_id: number;
          entity_type: string;
          file_name: string;
          file_path: string;
          file_size: number;
          file_type: string;
          id: number;
          is_deleted: boolean;
          owner_id: string;
          preview_path: string | null;
          updated_at: string;
          vehicle_id: number | null;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          entity_id: number;
          entity_type: string;
          file_name: string;
          file_path: string;
          file_size: number;
          file_type: string;
          id?: number;
          is_deleted?: boolean;
          owner_id: string;
          preview_path?: string | null;
          updated_at?: string;
          vehicle_id?: number | null;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          entity_id?: number;
          entity_type?: string;
          file_name?: string;
          file_path?: string;
          file_size?: number;
          file_type?: string;
          id?: number;
          is_deleted?: boolean;
          owner_id?: string;
          preview_path?: string | null;
          updated_at?: string;
          vehicle_id?: number | null;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          amount: number;
          created_at: string | null;
          date: string;
          id: number;
          insurance_contract_id: number | null;
          notes: string | null;
          owner_id: string;
          type: string;
          updated_at: string | null;
          vehicle_id: number;
        };
        Insert: {
          amount: number;
          created_at?: string | null;
          date: string;
          id?: number;
          insurance_contract_id?: number | null;
          notes?: string | null;
          owner_id: string;
          type: string;
          updated_at?: string | null;
          vehicle_id: number;
        };
        Update: {
          amount?: number;
          created_at?: string | null;
          date?: string;
          id?: number;
          insurance_contract_id?: number | null;
          notes?: string | null;
          owner_id?: string;
          type?: string;
          updated_at?: string | null;
          vehicle_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'expenses_insurance_contract_fk';
            columns: ['insurance_contract_id'];
            isOneToOne: false;
            referencedRelation: 'insurance_contracts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expenses_insurance_contract_fk';
            columns: ['insurance_contract_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles_for_display';
            referencedColumns: ['insurance_id'];
          },
          {
            foreignKeyName: 'expenses_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expenses_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'users_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expenses_vehicle_id_fkey';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expenses_vehicle_id_fkey';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles_for_display';
            referencedColumns: ['vehicle_id'];
          },
        ];
      };
      families: {
        Row: {
          created_at: string | null;
          id: string;
          invite_token: string;
          name: string;
          owner_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          invite_token?: string;
          name: string;
          owner_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          invite_token?: string;
          name?: string;
          owner_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'families_owner_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'families_owner_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'users_info';
            referencedColumns: ['id'];
          },
        ];
      };
      family_members: {
        Row: {
          family_id: string;
          id: number;
          joined_at: string | null;
          role: string;
          user_id: string;
        };
        Insert: {
          family_id: string;
          id?: number;
          joined_at?: string | null;
          role?: string;
          user_id: string;
        };
        Update: {
          family_id?: string;
          id?: number;
          joined_at?: string | null;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'family_members_family_id_fkey';
            columns: ['family_id'];
            isOneToOne: false;
            referencedRelation: 'families';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'family_members_family_id_fkey';
            columns: ['family_id'];
            isOneToOne: false;
            referencedRelation: 'family_for_display';
            referencedColumns: ['family_id'];
          },
          {
            foreignKeyName: 'family_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'family_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users_info';
            referencedColumns: ['id'];
          },
        ];
      };
      fills: {
        Row: {
          charge_type: string | null;
          created_at: string | null;
          expense_id: number;
          id: number;
          kwh: number | null;
          liters: number | null;
          odometer: number;
          price_per_kwh: number | null;
          price_per_liter: number;
        };
        Insert: {
          charge_type?: string | null;
          created_at?: string | null;
          expense_id: number;
          id?: number;
          kwh?: number | null;
          liters?: number | null;
          odometer: number;
          price_per_kwh?: number | null;
          price_per_liter: number;
        };
        Update: {
          charge_type?: string | null;
          created_at?: string | null;
          expense_id?: number;
          id?: number;
          kwh?: number | null;
          liters?: number | null;
          odometer?: number;
          price_per_kwh?: number | null;
          price_per_liter?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'fills_expense_id_fkey';
            columns: ['expense_id'];
            isOneToOne: false;
            referencedRelation: 'expenses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fills_expense_id_fkey';
            columns: ['expense_id'];
            isOneToOne: false;
            referencedRelation: 'expenses_for_display';
            referencedColumns: ['id'];
          },
        ];
      };
      insurance_contracts: {
        Row: {
          end_date: string | null;
          id: number;
          monthly_cost: number;
          owner_id: string;
          provider: string | null;
          start_date: string;
          vehicle_id: number;
        };
        Insert: {
          end_date?: string | null;
          id?: number;
          monthly_cost: number;
          owner_id: string;
          provider?: string | null;
          start_date: string;
          vehicle_id: number;
        };
        Update: {
          end_date?: string | null;
          id?: number;
          monthly_cost?: number;
          owner_id?: string;
          provider?: string | null;
          start_date?: string;
          vehicle_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'insurance_contracts_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'insurance_contracts_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'users_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'insurance_vehicle_fk';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'insurance_vehicle_fk';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles_for_display';
            referencedColumns: ['vehicle_id'];
          },
        ];
      };
      maintenance_expenses: {
        Row: {
          expense_id: number;
          garage: string | null;
          maintenance_type_id: string | null;
          odometer: number | null;
        };
        Insert: {
          expense_id: number;
          garage?: string | null;
          maintenance_type_id?: string | null;
          odometer?: number | null;
        };
        Update: {
          expense_id?: number;
          garage?: string | null;
          maintenance_type_id?: string | null;
          odometer?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'maintenance_expense_fk';
            columns: ['expense_id'];
            isOneToOne: true;
            referencedRelation: 'expenses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_expense_fk';
            columns: ['expense_id'];
            isOneToOne: true;
            referencedRelation: 'expenses_for_display';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_expenses_type_fkey';
            columns: ['maintenance_type_id'];
            isOneToOne: false;
            referencedRelation: 'expenses_for_display';
            referencedColumns: ['maintenance_type'];
          },
          {
            foreignKeyName: 'maintenance_expenses_type_fkey';
            columns: ['maintenance_type_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_types';
            referencedColumns: ['id'];
          },
        ];
      };
      maintenance_types: {
        Row: {
          id: string;
          interval_km: number | null;
          interval_months: number | null;
          label_fr: string;
        };
        Insert: {
          id: string;
          interval_km?: number | null;
          interval_months?: number | null;
          label_fr: string;
        };
        Update: {
          id?: string;
          interval_km?: number | null;
          interval_months?: number | null;
          label_fr?: string;
        };
        Relationships: [];
      };
      other_expenses: {
        Row: {
          expense_id: number;
          label: string;
        };
        Insert: {
          expense_id: number;
          label: string;
        };
        Update: {
          expense_id?: number;
          label?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'other_expense_fk';
            columns: ['expense_id'];
            isOneToOne: true;
            referencedRelation: 'expenses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'other_expense_fk';
            columns: ['expense_id'];
            isOneToOne: true;
            referencedRelation: 'expenses_for_display';
            referencedColumns: ['id'];
          },
        ];
      };
      reminders: {
        Row: {
          created_at: string | null;
          description: string | null;
          due_date: string | null;
          due_odometer: number | null;
          estimated_due_date: string | null;
          id: number;
          is_completed: boolean | null;
          is_recurring: boolean | null;
          last_triggered_at: string | null;
          maintenance_type_id: string | null;
          recurrence_type: string | null;
          recurrence_value: number | null;
          source_expense_id: number | null;
          title: string;
          type: string;
          user_id: string;
          vehicle_id: number | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          due_odometer?: number | null;
          estimated_due_date?: string | null;
          id?: number;
          is_completed?: boolean | null;
          is_recurring?: boolean | null;
          last_triggered_at?: string | null;
          maintenance_type_id?: string | null;
          recurrence_type?: string | null;
          recurrence_value?: number | null;
          source_expense_id?: number | null;
          title: string;
          type: string;
          user_id: string;
          vehicle_id?: number | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          due_odometer?: number | null;
          estimated_due_date?: string | null;
          id?: number;
          is_completed?: boolean | null;
          is_recurring?: boolean | null;
          last_triggered_at?: string | null;
          maintenance_type_id?: string | null;
          recurrence_type?: string | null;
          recurrence_value?: number | null;
          source_expense_id?: number | null;
          title?: string;
          type?: string;
          user_id?: string;
          vehicle_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'reminders_maintenance_type_fk';
            columns: ['maintenance_type_id'];
            isOneToOne: false;
            referencedRelation: 'expenses_for_display';
            referencedColumns: ['maintenance_type'];
          },
          {
            foreignKeyName: 'reminders_maintenance_type_fk';
            columns: ['maintenance_type_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_types';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reminders_source_expense_id_fkey';
            columns: ['source_expense_id'];
            isOneToOne: false;
            referencedRelation: 'expenses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reminders_source_expense_id_fkey';
            columns: ['source_expense_id'];
            isOneToOne: false;
            referencedRelation: 'expenses_for_display';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reminders_user_fk';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reminders_user_fk';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reminders_vehicle_fk';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reminders_vehicle_fk';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles_for_display';
            referencedColumns: ['vehicle_id'];
          },
        ];
      };
      user_preferences: {
        Row: {
          created_at: string | null;
          default_period: string;
          default_vehicle_id: number | null;
          default_vehicle_scope: string;
          show_consumption: boolean;
          show_financials: boolean;
          show_insurance: boolean;
          show_vehicle_details: boolean;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          default_period?: string;
          default_vehicle_id?: number | null;
          default_vehicle_scope?: string;
          show_consumption?: boolean;
          show_financials?: boolean;
          show_insurance?: boolean;
          show_vehicle_details?: boolean;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          default_period?: string;
          default_vehicle_id?: number | null;
          default_vehicle_scope?: string;
          show_consumption?: boolean;
          show_financials?: boolean;
          show_insurance?: boolean;
          show_vehicle_details?: boolean;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_preferences_default_vehicle_fk';
            columns: ['default_vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_preferences_default_vehicle_fk';
            columns: ['default_vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles_for_display';
            referencedColumns: ['vehicle_id'];
          },
          {
            foreignKeyName: 'user_preferences_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_preferences_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users_info';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          email: string;
          id: string;
          name: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          email: string;
          id: string;
          name: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      vehicle_permissions: {
        Row: {
          created_at: string | null;
          id: number;
          permission_level: string;
          updated_at: string | null;
          user_id: string;
          vehicle_id: number;
        };
        Insert: {
          created_at?: string | null;
          id?: number;
          permission_level: string;
          updated_at?: string | null;
          user_id: string;
          vehicle_id: number;
        };
        Update: {
          created_at?: string | null;
          id?: number;
          permission_level?: string;
          updated_at?: string | null;
          user_id?: string;
          vehicle_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'vehicle_permissions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_permissions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_permissions_vehicle_id_fkey';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_permissions_vehicle_id_fkey';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles_for_display';
            referencedColumns: ['vehicle_id'];
          },
        ];
      };
      vehicles: {
        Row: {
          co2_emission: number | null;
          color: string | null;
          created_at: string | null;
          financing_mode: string | null;
          fuel_type: string | null;
          id: number;
          image: string | null;
          make: string;
          model: string;
          name: string | null;
          odometer: number;
          owner_id: string;
          plate: string | null;
          purchase_date: string | null;
          purchase_price: number | null;
          status: string | null;
          tech_control_expiry: string | null;
          transmission: string | null;
          vin: string | null;
          year: number | null;
        };
        Insert: {
          co2_emission?: number | null;
          color?: string | null;
          created_at?: string | null;
          financing_mode?: string | null;
          fuel_type?: string | null;
          id?: number;
          image?: string | null;
          make: string;
          model: string;
          name?: string | null;
          odometer: number;
          owner_id: string;
          plate?: string | null;
          purchase_date?: string | null;
          purchase_price?: number | null;
          status?: string | null;
          tech_control_expiry?: string | null;
          transmission?: string | null;
          vin?: string | null;
          year?: number | null;
        };
        Update: {
          co2_emission?: number | null;
          color?: string | null;
          created_at?: string | null;
          financing_mode?: string | null;
          fuel_type?: string | null;
          id?: number;
          image?: string | null;
          make?: string;
          model?: string;
          name?: string | null;
          odometer?: number;
          owner_id?: string;
          plate?: string | null;
          purchase_date?: string | null;
          purchase_price?: number | null;
          status?: string | null;
          tech_control_expiry?: string | null;
          transmission?: string | null;
          vin?: string | null;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'vehicles_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicles_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'users_info';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      due_reminders: {
        Row: {
          attachments: Json | null;
          created_at: string | null;
          description: string | null;
          due_date: string | null;
          due_odometer: number | null;
          estimated_due_date: string | null;
          id: number | null;
          is_completed: boolean | null;
          is_recurring: boolean | null;
          last_triggered_at: string | null;
          maintenance_type_id: string | null;
          recurrence_type: string | null;
          recurrence_value: number | null;
          title: string | null;
          type: string | null;
          user_id: string | null;
          vehicle_id: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'reminders_maintenance_type_fk';
            columns: ['maintenance_type_id'];
            isOneToOne: false;
            referencedRelation: 'expenses_for_display';
            referencedColumns: ['maintenance_type'];
          },
          {
            foreignKeyName: 'reminders_maintenance_type_fk';
            columns: ['maintenance_type_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_types';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reminders_user_fk';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reminders_user_fk';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reminders_vehicle_fk';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reminders_vehicle_fk';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles_for_display';
            referencedColumns: ['vehicle_id'];
          },
        ];
      };
      expenses_for_display: {
        Row: {
          amount: number | null;
          attachments: Json | null;
          charge_type: string | null;
          date: string | null;
          garage: string | null;
          id: number | null;
          kwh: number | null;
          label: string | null;
          liters: number | null;
          maintenance_type: string | null;
          maintenance_type_label: string | null;
          notes: string | null;
          odometer: number | null;
          owner_id: string | null;
          owner_name: string | null;
          price_per_kwh: number | null;
          price_per_liter: number | null;
          type: string | null;
          vehicle_id: number | null;
          vehicle_name: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'expenses_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expenses_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'users_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expenses_vehicle_id_fkey';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expenses_vehicle_id_fkey';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles_for_display';
            referencedColumns: ['vehicle_id'];
          },
        ];
      };
      family_for_display: {
        Row: {
          email: string | null;
          family_created_at: string | null;
          family_id: string | null;
          family_name: string | null;
          family_owner_id: string | null;
          invite_token: string | null;
          joined_at: string | null;
          role: string | null;
          user_id: string | null;
          user_name: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'families_owner_fkey';
            columns: ['family_owner_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'families_owner_fkey';
            columns: ['family_owner_id'];
            isOneToOne: false;
            referencedRelation: 'users_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'family_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'family_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users_info';
            referencedColumns: ['id'];
          },
        ];
      };
      users_info: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          email: string | null;
          families: Json | null;
          has_family: boolean | null;
          has_vehicle: boolean | null;
          id: string | null;
          name: string | null;
          vehicle_count: number | null;
          vehicle_ids: number[] | null;
        };
        Relationships: [];
      };
      vehicles_for_display: {
        Row: {
          attachments: Json | null;
          calculated_consumption: number | null;
          calculated_consumption_kwh: number | null;
          co2_emission: number | null;
          color: string | null;
          created_at: string | null;
          family_id: string | null;
          family_ids: string[] | null;
          financing_mode: string | null;
          fuel_type: string | null;
          image: string | null;
          insurance_end_date: string | null;
          insurance_id: number | null;
          insurance_monthly_cost: number | null;
          insurance_owner_id: string | null;
          insurance_provider: string | null;
          insurance_start_date: string | null;
          last_fill_date: string | null;
          make: string | null;
          model: string | null;
          name: string | null;
          odometer: number | null;
          owner_id: string | null;
          owner_name: string | null;
          permission_level: string | null;
          plate: string | null;
          purchase_date: string | null;
          purchase_price: number | null;
          status: string | null;
          tech_control_expiry: string | null;
          transmission: string | null;
          vehicle_id: number | null;
          vin: string | null;
          year: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'insurance_contracts_owner_id_fkey';
            columns: ['insurance_owner_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'insurance_contracts_owner_id_fkey';
            columns: ['insurance_owner_id'];
            isOneToOne: false;
            referencedRelation: 'users_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicles_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicles_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'users_info';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      compute_next_due: {
        Args: { p_maintenance_type_id: string; p_vehicle_id: number };
        Returns: {
          next_date: string;
          next_odometer: number;
          recurrence_type: string;
          recurrence_value: number;
        }[];
      };
      create_insurance_expenses: { Args: never; Returns: undefined };
      delete_insurance_contract: { Args: { p_id: number }; Returns: boolean };
      get_family_visibility_prefs: {
        Args: { p_user_ids: string[] };
        Returns: {
          show_consumption: boolean;
          show_financials: boolean;
          show_insurance: boolean;
          show_vehicle_details: boolean;
          user_id: string;
        }[];
      };
      get_last_maintenance: {
        Args: { p_maintenance_type_id: string; p_vehicle_id: number };
        Returns: {
          last_date: string;
          last_odometer: number;
        }[];
      };
      has_vehicle_permission: {
        Args: { level: string; v_id: number };
        Returns: boolean;
      };
      is_same_family: { Args: { owner: string }; Returns: boolean };
      orphaned_user_storage_objects: {
        Args: { p_user_id: string };
        Returns: {
          bucket_id: string;
          name: string;
        }[];
      };
      save_expense_with_detail: {
        Args: { p_detail?: Json; p_expense: Json; p_expense_id: number };
        Returns: Json;
      };
      save_insurance_contract: {
        Args: {
          p_close_end?: string;
          p_close_id?: number;
          p_contract: Json;
          p_instalments: string[];
        };
        Returns: Json;
      };
      update_maintenance_reminder: {
        Args: { p_maintenance_type_id: string; p_vehicle_id: number };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

/** Row type of a table or view, e.g. `Tables<'vehicles'>` or `Tables<'vehicles_for_display'>`. */
export type Tables<Name extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])> =
  (DefaultSchema['Tables'] & DefaultSchema['Views'])[Name] extends { Row: infer R } ? R : never;

/** Insert payload of a table, e.g. `TablesInsert<'expenses'>`. */
export type TablesInsert<Name extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][Name] extends { Insert: infer I } ? I : never;

/** Update payload of a table, e.g. `TablesUpdate<'vehicles'>`. */
export type TablesUpdate<Name extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][Name] extends { Update: infer U } ? U : never;
