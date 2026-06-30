# Hotel Fletcher V2

Nuova base di lavoro separata dalla versione attualmente in uso.

## Obiettivo

Questa repository nasce per sviluppare la V2 del gestionale senza toccare il file operativo attuale.

## Stato iniziale

- `index.html` contiene la struttura HTML della nuova app.
- `css/style.css` contiene gli stili principali.
- `js/app.js` contiene il punto di ingresso JavaScript.
- `docs/ROADMAP.md` contiene la roadmap di sviluppo.

## Roadmap consigliata

1. Verificare che la V2 funzioni identica alla versione attuale.
2. Separare `js/app.js` in moduli: state, storage, rooms, stays, export, cloud, validators, UI.
3. Pulire CSS duplicati e suddividerli in componenti.
4. Aggiungere log modifiche e audit trail.
5. Aggiungere import Excel.
6. Migliorare cloud sync con gestione conflitti.
7. Aggiungere utenti, ruoli e permessi.

## Regola operativa

La versione in produzione non va modificata durante lo sviluppo della V2.
