export type Lang = 'de' | 'fr' | 'it' | 'rm' | 'en'

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'de', label: 'DE' },
  { code: 'fr', label: 'FR' },
  { code: 'it', label: 'IT' },
  { code: 'rm', label: 'RM' },
  { code: 'en', label: 'EN' },
]

const de = {
  nav: {
    votations: 'Abstimmungen',
    demographics: 'Demografie',
  },
  demographics: {
    title: 'Demografie',
    topic: 'Thema',
    source: 'Quelle',
    loading: 'Wird geladen…',
    error: 'Daten konnten nicht geladen werden.',
    noData: 'Keine Daten',
    backLabel: '← Schweiz',
  },
  sidebar: {
    voteDate: 'Abstimmung',
    proposals: 'Vorlagen',
    nationalResult: 'Resultat Schweiz',
    cantonalVotes: 'Ständemehr',
    cantonalVotesOf: 'von 23',
    canton: 'Kanton',
    loading: 'Wird geladen…',
    pending: 'Ausstehend',
    final: 'Ausgezählt',
    yes: 'Ja',
    no: 'Nein',
    turnout: 'Beteiligung',
    noData: 'Keine Daten',
    error: 'Daten konnten nicht geladen werden.',
  },
  map: {
    backLabel: '← Schweiz',
    pending: 'Ausstehend',
    turnout: 'Beteiligung',
  },
  vorlageArt: {
    1: 'Obligatorisches Referendum',
    2: 'Fakultatives Referendum',
    3: 'Volksinitiative',
    4: 'Volksinitiative',
    5: 'Gegenvorschlag',
    6: 'Stichfrage',
  } as Record<number, string>,
}

type Translations = typeof de

const fr: Translations = {
  nav: {
    votations: 'Votations',
    demographics: 'Démographie',
  },
  demographics: {
    title: 'Démographie',
    topic: 'Thème',
    source: 'Source',
    loading: 'Chargement…',
    error: 'Impossible de charger les données.',
    noData: 'Aucune donnée',
    backLabel: '← Suisse',
  },
  sidebar: {
    voteDate: 'Votation',
    proposals: 'Objets',
    nationalResult: 'Résultat national',
    cantonalVotes: 'Vote des cantons',
    cantonalVotesOf: 'sur 23',
    canton: 'Canton',
    loading: 'Chargement…',
    pending: 'En attente',
    final: 'Définitif',
    yes: 'Oui',
    no: 'Non',
    turnout: 'Participation',
    noData: 'Aucune donnée',
    error: 'Impossible de charger les données.',
  },
  map: {
    backLabel: '← Suisse',
    pending: 'En attente',
    turnout: 'Participation',
  },
  vorlageArt: {
    1: 'Référendum obligatoire',
    2: 'Référendum facultatif',
    3: 'Initiative populaire',
    4: 'Initiative populaire',
    5: 'Contre-projet',
    6: 'Question subsidiaire',
  },
}

const it: Translations = {
  nav: {
    votations: 'Votazioni',
    demographics: 'Demografia',
  },
  demographics: {
    title: 'Demografia',
    topic: 'Tema',
    source: 'Fonte',
    loading: 'Caricamento…',
    error: 'Impossibile caricare i dati.',
    noData: 'Nessun dato',
    backLabel: '← Svizzera',
  },
  sidebar: {
    voteDate: 'Votazione',
    proposals: 'Oggetti',
    nationalResult: 'Risultato nazionale',
    cantonalVotes: 'Voto dei cantoni',
    cantonalVotesOf: 'su 23',
    canton: 'Cantone',
    loading: 'Caricamento…',
    pending: 'In attesa',
    final: 'Definitivo',
    yes: 'Sì',
    no: 'No',
    turnout: 'Partecipazione',
    noData: 'Nessun dato',
    error: 'Impossibile caricare i dati.',
  },
  map: {
    backLabel: '← Svizzera',
    pending: 'In attesa',
    turnout: 'Partecipazione',
  },
  vorlageArt: {
    1: 'Referendum obbligatorio',
    2: 'Referendum facoltativo',
    3: 'Iniziativa popolare',
    4: 'Iniziativa popolare',
    5: 'Controprogetto',
    6: 'Domanda subsidiaria',
  },
}

const rm: Translations = {
  nav: {
    votations: 'Votaziuns',
    demographics: 'Demografica',
  },
  demographics: {
    title: 'Demografica',
    topic: 'Tema',
    source: 'Funtauna',
    loading: 'Chargament…',
    error: 'Impussibel da chargiar las datas.',
    noData: 'Nagins datas',
    backLabel: '← Svizra',
  },
  sidebar: {
    voteDate: 'Votaziun',
    proposals: 'Objects',
    nationalResult: 'Resultat Svizra',
    cantonalVotes: 'Vut dals chantuns',
    cantonalVotesOf: 'da 23',
    canton: 'Chantun',
    loading: 'Chargament…',
    pending: 'En spetga',
    final: 'Definitiv',
    yes: 'Gea',
    no: 'Na',
    turnout: 'Participaziun',
    noData: 'Nagins datas',
    error: 'Impussibel da chargiar las datas.',
  },
  map: {
    backLabel: '← Svizra',
    pending: 'En spetga',
    turnout: 'Participaziun',
  },
  vorlageArt: {
    1: 'Referendum obligatoric',
    2: 'Referendum facultativ',
    3: 'Iniziativa dal pievel',
    4: 'Iniziativa dal pievel',
    5: 'Cuntraproposta',
    6: 'Dumonda subsidaria',
  },
}

const en: Translations = {
  nav: {
    votations: 'Votations',
    demographics: 'Demographics',
  },
  demographics: {
    title: 'Demographics',
    topic: 'Topic',
    source: 'Source',
    loading: 'Loading…',
    error: 'Could not load demographic data.',
    noData: 'No data',
    backLabel: '← Switzerland',
  },
  sidebar: {
    voteDate: 'Vote date',
    proposals: 'Proposals',
    nationalResult: 'National result',
    cantonalVotes: 'Cantonal votes',
    cantonalVotesOf: 'of 23',
    canton: 'Canton',
    loading: 'Loading…',
    pending: 'Pending',
    final: 'Final',
    yes: 'Yes',
    no: 'No',
    turnout: 'Turnout',
    noData: 'No data',
    error: 'Could not load votation data.',
  },
  map: {
    backLabel: '← Switzerland',
    pending: 'Pending',
    turnout: 'Turnout',
  },
  vorlageArt: {
    1: 'Mandatory referendum',
    2: 'Optional referendum',
    3: 'Popular initiative',
    4: 'Popular initiative',
    5: 'Counter-proposal',
    6: 'Deciding question',
  },
}

export const translations: Record<Lang, Translations> = { de, fr, it, rm, en }
