export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      leases: {
        Row: {
          id: string;
          user_id: string;
          property_id: string;
          room: string;
          tenant_name: string;
          first_contract_date: string;
          current_start_date: string;
          current_end_date: string;
          deposit: number;
          monthly_rent: number;
          payment_day: number;
          special_terms: string | null;
          contract_storage_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          property_id: string;
          room: string;
          tenant_name: string;
          first_contract_date: string;
          current_start_date: string;
          current_end_date: string;
          deposit: number;
          monthly_rent: number;
          payment_day: number;
          special_terms?: string | null;
          contract_storage_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          property_id?: string;
          room?: string;
          tenant_name?: string;
          first_contract_date?: string;
          current_start_date?: string;
          current_end_date?: string;
          deposit?: number;
          monthly_rent?: number;
          payment_day?: number;
          special_terms?: string | null;
          contract_storage_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leases_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          lease_id: string;
          period_month: string;
          paid_on: string;
          amount: number;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lease_id: string;
          period_month: string;
          paid_on: string;
          amount: number;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lease_id?: string;
          period_month?: string;
          paid_on?: string;
          amount?: number;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_lease_id_fkey";
            columns: ["lease_id"];
            isOneToOne: false;
            referencedRelation: "leases";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          id: string;
          user_id: string;
          lease_id: string;
          occurred_on: string;
          tag: string;
          memo: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lease_id: string;
          occurred_on: string;
          tag: string;
          memo?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lease_id?: string;
          occurred_on?: string;
          tag?: string;
          memo?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_lease_id_fkey";
            columns: ["lease_id"];
            isOneToOne: false;
            referencedRelation: "leases";
            referencedColumns: ["id"];
          },
        ];
      };
      attachments: {
        Row: {
          id: string;
          user_id: string;
          event_id: string;
          storage_path: string;
          file_name: string | null;
          content_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_id: string;
          storage_path: string;
          file_name?: string | null;
          content_type?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_id?: string;
          storage_path?: string;
          file_name?: string | null;
          content_type?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attachments_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      drafts: {
        Row: {
          id: string;
          user_id: string;
          lease_id: string;
          kind: string;
          body: string;
          cited_articles: string[];
          created_at: string;
          sent_on: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          lease_id: string;
          kind: string;
          body: string;
          cited_articles?: string[];
          created_at?: string;
          sent_on?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          lease_id?: string;
          kind?: string;
          body?: string;
          cited_articles?: string[];
          created_at?: string;
          sent_on?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "drafts_lease_id_fkey";
            columns: ["lease_id"];
            isOneToOne: false;
            referencedRelation: "leases";
            referencedColumns: ["id"];
          },
        ];
      };
      law_chunks: {
        Row: {
          id: string;
          article_no: string;
          body: string;
          embedding: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          article_no: string;
          body: string;
          embedding?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          article_no?: string;
          body?: string;
          embedding?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
