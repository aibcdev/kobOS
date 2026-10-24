-- Twilio subaccounts (one per restaurant) as Integration rows, so webhook signatures use the subaccount token.
ALTER TYPE "public"."IntegrationProvider" ADD VALUE IF NOT EXISTS 'TWILIO';
