import { createParamDecorator } from '@nestjs/common';
import { DEMO_USER } from './demo-user.js';

/**
 * Geeft de id van de ingelogde gebruiker. Voorlopig altijd de demo-gebruiker; in de auth-stap
 * wordt dit de enige plek die de gebruiker uit de gevalideerde JWT haalt.
 */
export const CurrentUserId = createParamDecorator((): string => DEMO_USER.id);
