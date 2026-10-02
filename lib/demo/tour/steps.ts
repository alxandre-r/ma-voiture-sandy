/**
 * @file lib/demo/tour/steps.ts
 * @description Scenario of the demo guided tour (spec §8): 7 chapters, 19 steps.
 * Each `target` is a data-tour attribute in the app; __tests__/tour/anchors.test.ts checks
 * that every one of them exists in the source.
 */

import type { TourChapter, TourStep } from './types';

export const TOUR_CHAPTERS: readonly TourChapter[] = [
  { id: 'dashboard', label: 'Tableau de bord', emoji: '🏠' },
  { id: 'statistics', label: 'Statistiques', emoji: '📊' },
  { id: 'expenses', label: 'Dépenses', emoji: '💶' },
  { id: 'maintenance', label: 'Entretiens et rappels', emoji: '🔧' },
  { id: 'insurance-garage', label: 'Assurance et garage', emoji: '🛡️' },
  { id: 'family', label: 'Famille', emoji: '👨‍👩‍👧' },
  { id: 'finish', label: 'Pour finir', emoji: '✨' },
];

export const TOUR_STEPS: readonly TourStep[] = [
  // ── Tableau de bord ──
  {
    id: 'dashboard-stats',
    chapter: 'dashboard',
    route: '/dashboard',
    target: 'dashboard-stats',
    title: "L'essentiel en 4 chiffres",
    body: 'Coût aux 100 km, total, consommation et dernier plein, avec leur tendance par rapport à la période précédente.',
  },
  {
    id: 'dashboard-insights',
    chapter: 'dashboard',
    route: '/dashboard',
    target: 'dashboard-insights',
    title: 'Ce qui mérite votre attention',
    body: 'CT qui approche, rappel en retard, plein trop gourmand pour la 308 : rien ne vous échappe. Un clic vous emmène au bon endroit.',
  },
  {
    id: 'dashboard-vehicles',
    chapter: 'dashboard',
    route: '/dashboard',
    target: 'dashboard-vehicles',
    title: 'Une note de A à F',
    body: 'Chaque véhicule reçoit un score de suivi selon son CT, ses rappels et son assurance. Visez le A, personne ne vous juge.',
  },
  {
    id: 'header-filters',
    chapter: 'dashboard',
    route: '/dashboard',
    target: 'header-filters',
    placement: 'left',
    interactive: true,
    title: 'Essayez : filtrez à volonté',
    body: 'Changez de véhicules ou de période : tout se recalcule, et votre choix vous suit sur chaque page.',
  },
  {
    id: 'expense-button',
    chapter: 'dashboard',
    route: '/dashboard',
    target: 'expense-button',
    placement: 'left',
    onEnter: { type: 'click', target: 'expense-button' },
    onExit: { type: 'click-outside' },
    title: 'Une dépense en dix secondes',
    body: 'Plein, recharge, entretien, autre dépense ou rappel : tout part de ce bouton.',
  },

  // ── Statistiques ──
  {
    id: 'stats-overview',
    chapter: 'statistics',
    route: '/statistics',
    target: 'stats-overview',
    title: "Vos dépenses en un coup d'œil",
    body: "Total, moyenne mensuelle, projection sur l'année et coût au kilomètre.",
  },
  {
    id: 'stats-monthly',
    chapter: 'statistics',
    route: '/statistics',
    target: 'stats-monthly',
    title: 'Mois après mois',
    body: 'Basculez entre catégories et véhicules, puis exportez le graphique en SVG.',
  },
  {
    id: 'stats-carbon',
    chapter: 'statistics',
    route: '/statistics',
    target: 'stats-carbon',
    title: 'Et la planète, dans tout ça ?',
    body: "L'empreinte carbone utilise les données officielles du véhicule ou, à défaut, les litres réellement consommés.",
  },
  {
    id: 'stats-comparison',
    chapter: 'statistics',
    route: '/statistics',
    target: 'stats-comparison',
    title: 'Le duel des véhicules',
    body: 'Toutes les catégories côte à côte : vous saurez enfin quel véhicule vous coûte le plus.',
  },

  // ── Dépenses ──
  {
    id: 'expenses-filters',
    chapter: 'expenses',
    route: '/expenses',
    target: 'expenses-filters',
    title: "Retrouvez n'importe quelle dépense",
    body: 'Filtrez par catégorie, cherchez dans les notes ou fixez une fourchette de montants.',
  },
  {
    id: 'expenses-list',
    chapter: 'expenses',
    route: '/expenses',
    target: 'expenses-list',
    title: "Tout l'historique, mois par mois",
    body: 'Un clic sur une ligne affiche le détail, le menu ⋮ permet de modifier ou de supprimer.',
  },
  {
    id: 'expenses-csv',
    chapter: 'expenses',
    route: '/expenses',
    target: 'expenses-csv',
    title: 'Un export pour le comptable',
    body: 'Un fichier CSV prêt pour votre comptable, votre assureur ou Excel.',
  },

  // ── Entretiens et rappels ──
  {
    id: 'maintenance-suggestions',
    chapter: 'maintenance',
    route: '/maintenance',
    target: 'maintenance-suggestions',
    title: 'Les entretiens à prévoir',
    body: "Les échéances sont calculées d'après votre historique : la révision de la 308 attend son tour. Un clic crée le rappel.",
  },
  {
    id: 'reminders-list',
    chapter: 'maintenance',
    route: '/reminders',
    target: 'reminders-list',
    title: 'Plus jamais de CT oublié',
    body: 'En retard, bientôt dus ou à venir. Pour les rappels au kilométrage, la date est estimée selon votre rythme de conduite.',
  },

  // ── Assurance et garage ──
  {
    id: 'insurance-overview',
    chapter: 'insurance-garage',
    route: '/insurance',
    target: 'insurance-overview',
    title: 'Vos contrats, sans paperasse',
    body: "Tarif, échéances et historique de chaque contrat. Un changement d'assureur se programme à l'avance, et les mensualités s'ajoutent toutes seules à vos dépenses.",
  },
  {
    id: 'vehicle-health',
    chapter: 'insurance-garage',
    route: '/garage?vehicleId=101',
    target: 'vehicle-health',
    title: 'Bilan de santé de la 308',
    body: 'Facteur par facteur, ce qui fait baisser sa note, et quoi faire pour la remonter.',
  },

  // ── Famille ──
  {
    id: 'family-vehicles',
    chapter: 'family',
    route: '/family',
    target: 'family-vehicles',
    title: 'En famille, chacun ses droits',
    body: 'Camille, Thomas et Léa partagent leurs véhicules. Le propriétaire choisit qui peut lire ou écrire.',
  },

  // ── Pour finir ──
  {
    id: 'global-search',
    chapter: 'finish',
    route: '/family',
    target: 'global-search',
    title: 'Tout trouver avec Ctrl+K',
    body: "Véhicules, dépenses, rappels, pages : quelques lettres suffisent. Essayez Ctrl+K depuis n'importe quelle page.",
  },
  {
    id: 'settings-panel',
    chapter: 'finish',
    route: '/settings',
    target: 'settings-panel',
    // The « Préférences » tab has no URL: open it programmatically
    onEnter: { type: 'click', target: 'settings-preferences' },
    title: 'À votre image',
    body: 'Thème clair ou sombre, filtres par défaut et ce que la famille voit de vos véhicules.',
  },
];

/** Shown as « Direction <label>… » while the tour navigates to a step's page */
export const TOUR_ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'le tableau de bord',
  '/statistics': 'les statistiques',
  '/expenses': 'les dépenses',
  '/maintenance': 'les entretiens',
  '/reminders': 'les rappels',
  '/insurance': "l'assurance",
  '/garage': 'le garage',
  '/family': 'la famille',
  '/settings': 'les paramètres',
};

/** Toast shown when the visitor quits the tour */
export const TOUR_RELAUNCH_HINT = 'Relancez la visite depuis le bandeau démo.';
