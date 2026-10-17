import { TranslatePipe, LocalePathPipe } from '../i18n/i18n';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import portrait from '../../assets/author/dario-640.webp';

@Component({
  imports: [TranslatePipe, LocalePathPipe, RouterLink],
  template: `
    <article class="author-page">
      <section class="author-intro" aria-labelledby="author-name">
        <div>
          <div class="eyebrow">{{ 'LE PERSONE DIETRO IL CODICE / L\\'AUTORE' | t }}</div>
          <h1 id="author-name">Dario<br><em>Chiapperini.</em></h1>
          <p class="lead">{{ 'Sono uno sviluppatore e consulente full-stack con base a Piacenza. Mi occupo di architettura, sviluppo e deploy: accompagno i progetti dall\\'idea all\\'applicazione operativa.' | t }}</p>
          <p class="author-intro-note">{{ 'FastAng nasce dal mio lavoro quotidiano e da un\\'idea precisa di semplicità.' | t }}</p>
        </div>
        <aside class="author-profile" [aria-label]="'Profilo e contatti' | t">
          <img class="author-photo" [src]="portrait" width="640" height="640" alt="Dario Chiapperini" decoding="async" fetchpriority="high">
          <span class="card-number">{{ 'AUTORE DI FASTANG' | t }}</span>
          <h2>Dario Chiapperini</h2>
          <p>{{ 'Sviluppatore & consulente full-stack' | t }}<br>{{ 'Piacenza, Italia' | t }}</p>
          <div class="author-links">
            <a href="https://www.dariochiapperini.dev/" target="_blank" rel="noopener noreferrer">{{ 'Il mio sito' | t }} <span aria-hidden="true">↗</span></a>
            <a href="https://www.linkedin.com/in/dario-chiapperini/" target="_blank" rel="noopener noreferrer">LinkedIn <span aria-hidden="true">↗</span></a>
          </div>
        </aside>
      </section>
      <section class="author-story" aria-labelledby="author-why">
        <div class="author-section-label"><span class="card-number">{{ '01 / IL PUNTO DI PARTENZA' | t }}</span><h2 id="author-why">{{ 'Cinque anni.' | t }}<br>{{ 'Due tecnologie.' | t }}</h2></div>
        <div class="author-prose"><p>{{ 'Lavoro con Angular e Fastify da cinque anni. Li ho usati per costruire progetti di ogni tipo, imparando a conoscerne possibilità, limiti e punti di incontro.' | t }}</p><p>{{ 'Questa esperienza mi ha portato a desiderare una base comune: un modo di sviluppare applicazioni complete che tenesse insieme le due tecnologie, con convenzioni chiare e responsabilità riconoscibili.' | t }}</p></div>
      </section>
      <section class="author-story" aria-labelledby="author-inspiration">
        <div class="author-section-label"><span class="card-number">{{ '02 / L\\'ISPIRAZIONE' | t }}</span><h2 id="author-inspiration">{{ 'Quello che amavo' | t }}<br>{{ 'di Next.js.' | t }}</h2></div>
        <div class="author-prose"><p>{{ 'Ho sempre apprezzato Next.js come framework fullstack per React, soprattutto nell\\'esperienza con il Pages Router. Mi piaceva poter seguire il percorso di una richiesta e capire dove viveva ogni responsabilità.' | t }}</p><p>{{ 'Con la direzione verso l\\'App Router e il modello di Client e Server Components, ho sentito quel modo di lavorare sempre più distante dal mio. Ho scelto di abbandonarlo perché cerco semplicità e una distinzione dei ruoli che mi risulti immediata quando leggo il codice.' | t }}</p><p>{{ 'È una scelta legata al mio modo di progettare software. Da lì è partita la ricerca di un\\'esperienza fullstack che mi convincesse nell\\'ecosistema Angular.' | t }}</p></div>
      </section>
      <section class="author-story" aria-labelledby="author-fastang">
        <div class="author-section-label"><span class="card-number">{{ '03 / PERCHÉ FASTANG' | t }}</span><h2 id="author-fastang">{{ 'Il framework' | t }}<br>{{ 'che volevo usare.' | t }}</h2></div>
        <div class="author-prose"><p>{{ 'Non ho trovato un framework fullstack per Angular che soddisfacesse quello che cercavo. Analog è stato uno spunto per immaginare una strada, e FastAng è il tentativo di costruirla secondo le mie priorità.' | t }}</p><p>{{ 'Voglio che Angular resti riconoscibile nell\\'interfaccia e che Fastify sia accessibile nel backend. Routing, API e rendering devono collaborare, lasciando leggibile il ruolo di ciascuna parte.' | t }}</p><p>{{ 'FastAng è ancora un prototipo. Il suo obiettivo è rendere più semplice il lavoro con due tecnologie che conosco e uso ogni giorno.' | t }}</p></div>
      </section>
      <blockquote class="author-quote"><p>{{ '«Semplicità e distinzione dei ruoli.»' | t }}</p><footer>{{ 'Dario Chiapperini · Autore di FastAng' | t }}</footer></blockquote>
      <section class="author-outro"><div><span class="eyebrow">{{ 'CONTINUIAMO LA CONVERSAZIONE' | t }}</span><h2>{{ 'Dal progetto, alle persone.' | t }}</h2><p>{{ 'Sul mio sito trovi i miei progetti e come contattarmi.' | t }}</p></div><div class="author-outro-actions"><a class="button" href="https://www.dariochiapperini.dev/" target="_blank" rel="noopener noreferrer">{{ 'Visita il mio sito' | t }} <span aria-hidden="true">↗</span></a><a class="text-link" [routerLink]="'/' | localePath">{{ 'Torna a FastAng →' | t }}</a></div></section>
    </article>
  `,
})
export default class AuthorPage {
  readonly portrait = portrait;
}
