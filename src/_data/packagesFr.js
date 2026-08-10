const audit = require("./audit.json");

module.exports = [
  {
    "keyPrefix": "rc_redflag",
    "name": 'Scan Technique "Red Flag"',
    "description": "Diagnostic visuel de 45 min pour une décision Go/No-Go avant acquisition.",
    "price": 97,
    "unit": null
  },
  {
    "keyPrefix": "rc_golden",
    "name": 'Audit Technique "Golden Ticket"',
    "description": `Rapport technique complet : ${audit.scoredPoints} points d'inspection notés plus un relevé d'environnement de ${audit.surveyPoints} points, cartographie d'humidité et budget CAPEX.`,
    "price": 490,
    "unit": null
  },
  {
    "keyPrefix": "rc_amcore",
    "name": "Gestion d'Actif Core",
    "description": "Gestion mensuelle : triage des Risques Actif, filtrage technique, visite semestrielle/de rotation.",
    "price": 140,
    "unit": "mo"
  },
  {
    "keyPrefix": "rc_ampremium",
    "name": "Gestion d'Actif Premium",
    "description": "Gestion d'Actif Core, plus 2 inspections techniques annuelles, plan de maintenance proactif et priorité prestataires.",
    "price": 190,
    "unit": "mo"
  },
  {
    "keyPrefix": "rc_guardcore",
    "name": "Gardiennage d'Actif Vacant Core",
    "description": "Gardiennage mensuel : 1 visite/mois, contrôle de l'humidité, contrôle de sécurité, évaluation post-intempéries.",
    "price": 120,
    "unit": "mo"
  },
  {
    "keyPrefix": "rc_guardpremium",
    "name": "Gardiennage d'Actif Vacant Premium",
    "description": "Gardiennage Core, plus 2 visites/mois, purge des réseaux, aération anti-humidité et coordination d'accès invités.",
    "price": 180,
    "unit": "mo"
  },
  {
    "keyPrefix": "rc_activation",
    "name": "Mise en Service de l'Actif",
    "description": "Transfert des services, récupération des clés, création du Coffre-fort Numérique et inventaire (sécurité et mobilier).",
    "price": 350,
    "unit": null
  },
  {
    "keyPrefix": "rc_techpm",
    "name": "Pilotage Technique de Projet",
    "description": "Tarif horaire pour la coordination complexe, le suivi de rénovation ou toute tâche technique hors forfaits standards.",
    "price": 65,
    "unit": "hr"
  },
  {
    "keyPrefix": "rc_callout",
    "name": "Déplacement Technique sur Site",
    "description": "Forfait minimum pour toute visite ponctuelle en heures ouvrées. Inclut la première heure.",
    "price": 85,
    "unit": null
  }
];
