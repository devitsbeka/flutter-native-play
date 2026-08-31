-- The King speaks every language of the app.
--
-- The duel pool existed only in English and Georgian, so a player whose app
-- language is Spanish, German, French, Italian or Portuguese pressed
-- "Challenge the King" and got KING_NO_QUESTIONS. This seeds the same 24
-- logic puzzles into all five, translated to the same bar as the Georgian
-- seed (20260920110000): direct translations of culture-neutral puzzles,
-- wrong options staying the answers a hasty solver actually produces, the
-- explanation spelling out the derivation, each row pointing back to its
-- English source through translated_from. Idempotent per language, keyed by
-- source tag; icons inherited from the English rows at the end.
--
-- And a belt for the braces: both draw paths now fall back to the English
-- pool when a language has none, so no future language can ever dead-end
-- into KING_NO_QUESTIONS again.


INSERT INTO public.king_questions
  (language, translated_from, question_text, correct_answer, incorrect_answers, explanation, difficulty, source, is_active)
SELECT
  'es',
  (SELECT e.id FROM public.king_questions e
    WHERE e.source = 'seed-en-1' AND e.question_text LIKE seed.en_prefix
    LIMIT 1),
  seed.q, seed.a, seed.w::jsonb, seed.x, seed.d, 'seed-es-1', true
FROM (VALUES
  ('You have two ropes%',
   'Tienes dos cuerdas. Cada una tarda exactamente una hora en arder de punta a punta, pero arden de forma irregular: media cuerda no significa media hora. Usando solo estas cuerdas y un mechero, ¿cómo mides exactamente 45 minutos?',
   'Enciende la cuerda A por ambos extremos y la B por uno; cuando A se acabe, enciende el otro extremo de B',
   '["Quema la cuerda A y luego la mitad de la cuerda B", "Dobla la cuerda A por la mitad y quémala junto a la B", "Enciende ambas por un extremo y detente cuando A esté a tres cuartos"]',
   'Una cuerda encendida por ambos extremos se consume en 30 minutos por muy irregular que arda: las dos llamas siempre se encuentran a la mitad del tiempo total. Cuando A se apaga han pasado exactamente 30 minutos y a B (encendida por un extremo) le quedan 30. Encender su otro extremo en ese momento reduce el resto a 15. 30 + 15 = 45. Las opciones erróneas dependen de que la longitud signifique algo, justo lo que la combustión irregular elimina.',
   4),

  ('A snail climbs%',
   'Un caracol sube un poste de 10 metros. Cada día sube 3 metros; cada noche resbala 2. ¿Qué día llega a la cima?',
   'El día 8',
   '["El día 10", "El día 7", "El día 9"]',
   'La trampa es tratar cada día como +1 neto. Eso vale solo mientras el caracol termina el día por debajo de la cima. Tras 7 días y noches completos está a 7 metros. El día 8 sube 3 y toca los 10: llega arriba antes de que la noche lo haga resbalar. «El día 10» es la respuesta de la aritmética de progreso neto; las otras sitúan mal dónde se rompe el patrón.',
   2),

  ('Three switches%',
   'Tres interruptores fuera de una habitación cerrada controlan tres lámparas dentro. Puedes accionarlos cuanto quieras, pero solo puedes abrir la puerta una vez. ¿Cómo sabes qué interruptor controla cada lámpara?',
   'Deja uno encendido un rato, apágalo, enciende un segundo y entra: lámpara caliente, encendida y fría',
   '["Acciona cada interruptor rápido y escucha los filamentos", "Enciende dos y razona a partir de cuáles se iluminan", "No puede hacerse con una sola visita"]',
   'La luz no es la única señal de una lámpara: la que estuvo encendida también guarda calor. Deja el interruptor 1 unos minutos, apágalo, enciende el 2 y entra: la encendida es 2, la apagada pero caliente es 1, la apagada y fría es 3. Con dos encendidos solo nombras dos lámparas y te queda una a ciegas: la versión que parece suficiente pero se queda un bit corta.',
   3),

  ('In a running race%',
   'En una carrera adelantas al corredor que va segundo. ¿En qué posición quedas?',
   'Segundo',
   '["Primero", "Tercero", "Depende de cuántos corredores haya"]',
   'Adelantar a alguien te deja en la posición que ocupaba. El corredor al que pasaste iba segundo, así que ahora tú eres segundo y él tercero. «Primero» nace de la sensación de que pasar a alguien delante te convierte en líder, pero nunca pasaste al líder.',
   1),

  ('A father is 36%',
   'Un padre tiene 36 años y su hijo 6. ¿Dentro de cuántos años el padre tendrá exactamente el triple de la edad del hijo?',
   '9 años',
   '["6 años", "12 años", "15 años"]',
   'Sea x el número de años: 36 + x = 3 × (6 + x), es decir 36 + x = 18 + 3x, y x = 9. Comprobación: 45 y 15. La DIFERENCIA de 30 años nunca cambia, así que el padre triplica al hijo justo cuando la edad del hijo iguala la mitad de esa diferencia: 15. Las opciones erróneas dividen lo que no toca: 36/6 sugiere 6, y doblar o partir edades sugiere 12 y 15.',
   3),

  ('You have a 5-liter jug%',
   'Tienes una jarra de 5 litros, una de 3 y una fuente de agua. ¿Cómo consigues exactamente 4 litros?',
   'Llena la de 5, vierte en la de 3, vacía la de 3, pasa los 2, rellena la de 5 y completa la de 3: quedan 4',
   '["Llena la de 3 y añade un tercio a la de 5 llena", "Llena ambas y tira la mitad del total", "Llena la de 5 y vierte lo que parezca un quinto"]',
   'Llena la de 5 y vierte en la de 3: la grande queda con exactamente 2. Vacía la de 3 y pasa esos 2: a la pequeña le cabe exactamente 1 más. Rellena la de 5 y completa la de 3: sale exactamente 1 litro y quedan 4. Cada paso es exacto porque llena o vacía una jarra por completo; las opciones erróneas exigen calcular una fracción a ojo, y el puzle no da forma de hacerlo.',
   3),

  ('A farmer has 17 sheep%',
   'Un granjero tiene 17 ovejas. Se escapan todas menos 9. ¿Cuántas quedan?',
   '9',
   '["8", "17", "Ninguna"]',
   '«Todas menos 9» significa «todas excepto 9»: las 9 son las que se quedaron. El reflejo es restar (17 − 9 = 8) porque la frase suena a problema de resta, pero el 9 nunca contó a las que se iban.',
   1),

  ('If 5 machines%',
   'Si 5 máquinas tardan 5 minutos en hacer 5 piezas, ¿cuánto tardan 100 máquinas en hacer 100 piezas?',
   '5 minutos',
   '["100 minutos", "20 minutos", "1 minuto"]',
   'Del enunciado, una máquina hace una pieza en 5 minutos. Cien máquinas haciendo cada una su pieza siguen tardando 5 minutos: el trabajo es perfectamente paralelo. «100 minutos» sale de calcar el patrón de números (5-5-5 → 100-100-100); las otras, de dividir lo que no debe dividirse.',
   2),

  ('A patch of lily pads%',
   'Un manto de nenúfares duplica su tamaño cada día. Cubre todo el lago el día 48. ¿Qué día cubría la mitad?',
   'El día 47',
   '["El día 24", "El día 46", "El día 12"]',
   'Duplicarse cada día significa que la víspera de cubrirlo todo cubría exactamente la mitad: el día 47. «El día 24» es la respuesta del crecimiento lineal, partir el tiempo en dos en vez de deshacer una duplicación. Lo exponencial pasa casi todo el tiempo pareciendo pequeño, y por eso esta respuesta se siente rara.',
   2),

  ('A bat and a ball%',
   'Un bate y una pelota cuestan juntos 110 monedas. El bate cuesta 100 monedas más que la pelota. ¿Cuánto cuesta la pelota?',
   '5 monedas',
   '["10 monedas", "15 monedas", "1 moneda"]',
   'Si la pelota cuesta b, el bate cuesta b + 100, y juntos: 2b + 100 = 110, así que b = 5. Comprobación: 5 + 105 = 110 y la diferencia es exactamente 100. El «10» inmediato cuadra el total pero deja la diferencia en 90: trata «100 más» como «el bate vale 100».',
   2),

  ('A man looks at a portrait%',
   'Un hombre mira un retrato y dice: «Ni hermanos ni hermanas tengo, pero el padre de ese hombre es el hijo de mi padre». ¿Quién está en el retrato?',
   'Su hijo',
   '["Él mismo", "Su padre", "Su hermano"]',
   'Resuelve de dentro hacia fuera: «el hijo de mi padre», para alguien sin hermanos, es el propio hablante. Sustituye: «el padre de ese hombre soy YO», así que el retrato muestra a su hijo. «Él mismo» es lo que la frase parece antes de sustituir; «su hermano» queda descartado en la primera cláusula.',
   3),

  ('You have 8 identical-looking balls%',
   'Tienes 8 bolas de aspecto idéntico; una pesa un poco más. Con una balanza de platillos, ¿cuántas pesadas necesitas, en el peor caso, para identificarla con certeza?',
   '2',
   '["3", "4", "7"]',
   'Pesa 3 contra 3. Si equilibran, la pesada está entre las 2 apartadas: una pesada más lo resuelve. Si un lado baja, está entre esas 3: pesa 1 contra 1, y o baja una o es la tercera. Cada pesada tiene tres resultados (izquierda, derecha, equilibrio), así que divide los candidatos entre tres, no entre dos: el «3» viene de partir a la mitad como si fuera una pregunta de sí o no.',
   4),

  ('At six o''clock a clock%',
   'A las seis en punto un reloj tarda 5 segundos en dar 6 campanadas. ¿Cuánto tarda en dar 12 campanadas a medianoche?',
   '11 segundos',
   '["10 segundos", "12 segundos", "6 segundos"]',
   'Lo que consume tiempo no son las campanadas sino los intervalos entre ellas. Seis campanadas tienen 5 intervalos, así que cada uno dura 1 segundo. Doce campanadas tienen 11 intervalos: 11 segundos. «10» duplica el tiempo original, lo que asume en silencio que 6 campanadas son 6 intervalos.',
   3),

  ('Two fathers and two sons%',
   'Dos padres y dos hijos se reparten tres manzanas y cada persona come exactamente una entera. ¿Cómo es posible?',
   'Son abuelo, padre e hijo: tres personas',
   '["Una manzana se cortó y compartió", "Uno de ellos comió dos", "No es posible"]',
   '«Dos padres y dos hijos» no exige cuatro personas. Un abuelo, su hijo y su nieto contienen dos padres (abuelo, padre) y dos hijos (padre, hijo) en tres personas: el de en medio cuenta dos veces. Tres personas, tres manzanas, una cada uno. Todas las opciones erróneas conservan en silencio la suposición de que hay cuatro.',
   2),

  ('How many times can you subtract%',
   '¿Cuántas veces puedes restar 10 de 100?',
   'Una vez',
   '["Diez veces", "Nueve veces", "Tantas como quieras"]',
   'Tras la primera resta ya no restas de 100, sino de 90. La pregunta habla específicamente de restar de 100, y eso solo puede ocurrir una vez. «Diez veces» responde a otra pregunta: cuántos pasos hasta que no quede nada.',
   2),

  ('A fair coin%',
   'Una moneda equilibrada ha salido cara 9 veces seguidas. ¿Qué probabilidad hay de que la próxima tirada también sea cara?',
   'Exactamente 1 entre 2',
   '["Menos de 1 entre 2: toca cruz", "Más de 1 entre 2: la moneda está en racha", "1 entre 1024"]',
   'La moneda no tiene memoria: cada tirada de una moneda equilibrada es 1/2 sin importar el historial. «Toca cruz» es la falacia del jugador; «está en racha» es la misma falacia al revés. 1/1024 es la probabilidad de diez caras seguidas calculada ANTES de tirar, no la de una cara más cuando ya hay nueve en el banco.',
   2),

  ('Five people meet%',
   'Cinco personas se encuentran y cada una estrecha la mano de cada una de las demás exactamente una vez. ¿Cuántos apretones hay?',
   '10',
   '["25", "20", "5"]',
   'Cada una de las 5 personas estrecha 4 manos, lo que cuenta 5 × 4 = 20, pero así cada apretón se cuenta dos veces, una por cada extremo. Entonces 20 / 2 = 10. «25» es 5 × 5 (dejando que cada uno se estreche su propia mano); «20» olvida el doble conteo; «5» los imagina en fila.',
   2),

  ('What is the minimum number of ducks%',
   '¿Cuál es el número mínimo de patos para que haya un pato delante de dos patos, un pato detrás de dos patos y un pato entre dos patos?',
   '3',
   '["5", "4", "6"]',
   'Tres patos en fila india cumplen las tres condiciones a la vez: el primero está delante de los otros dos, el último detrás de los otros dos y el del medio entre dos. Las descripciones suenan a tres escenas distintas con sus propios patos, pero son una sola escena contada de tres maneras.',
   3),

  ('A brick weighs%',
   'Un ladrillo pesa un kilogramo más medio ladrillo. ¿Cuánto pesa el ladrillo entero?',
   '2 kilogramos',
   '["1,5 kilogramos", "1 kilogramo", "3 kilogramos"]',
   'Llama w al ladrillo: w = 1 + w/2, así que w/2 = 1 y w = 2. Comprobación: 1 kg más la mitad de 2 kg son 2 kg. «1,5» viene de leer «medio ladrillo» como medio kilogramo fijo en vez de la mitad de la incógnita que se está resolviendo.',
   3),

  ('On the first of January%',
   'El uno de enero una chica dice: «Anteayer tenía 17 años y el año que viene cumpliré 20». ¿Cuándo es su cumpleaños?',
   'El 31 de diciembre',
   '["El 1 de enero", "El 2 de enero", "Es imposible"]',
   'Habla el 1 de enero. Anteayer —el 30 de diciembre— aún tenía 17. El 31 de diciembre cumplió 18. ESTE año, el 31 de diciembre, cumple 19, y el año que viene, 20. Todo cuadra solo si el cumpleaños es el 31 de diciembre y las palabras se dicen el 1 de enero: la única fecha en la que «el año que viene» apila dos cumpleaños de distancia.',
   5),

  ('A rowing boat hangs a rope ladder%',
   'Un bote de remos lleva colgada una escalera de cuerda; los peldaños distan 30 cm y a mediodía hay diez bajo el agua. La marea sube 90 cm hasta la tarde. ¿Cuántos peldaños quedan bajo el agua entonces?',
   'Siguen siendo diez',
   '["Trece", "Siete", "Doce"]',
   'El bote flota: al subir la marea, el bote y su escalera suben con ella, y la posición de la escalera respecto al agua no cambia nunca. «Trece» (10 + 90/30) es la respuesta para una escalera clavada al fondo del mar, que es la imagen que la pregunta invita en silencio a dibujar.',
   2),

  ('You are given three boxes%',
   'Te dan tres cajas etiquetadas MANZANAS, NARANJAS y MEZCLA, y te dicen que todas las etiquetas están mal. Sacando una sola fruta de una sola caja, ¿cómo reetiquetas las tres correctamente?',
   'Saca de la caja MEZCLA; su fruta la nombra, y las otras dos se intercambian',
   '["Saca de la caja etiquetada MANZANAS", "Saca una fruta de cada una de dos cajas", "No puede hacerse con una sola extracción"]',
   'La caja etiquetada MEZCLA no puede ser mezcla, así que la fruta que saques nombra su contenido verdadero y único: digamos manzanas. La caja etiquetada NARANJAS entonces no puede ser naranjas (su propia etiqueta) ni manzanas (ya asignadas), luego es la mezcla, y la última es naranjas. Empezar por MANZANAS enseña menos: una naranja extraída deja dos posibilidades abiertas. La jugada maestra es sacar de la etiqueta que miente por completo.',
   4),

  ('A rich eccentric%',
   'Un excéntrico rico ofrece un premio al camello MÁS LENTO: dos jinetes deben correr, y gana aquel cuyo camello cruce la meta el último. Los jinetes se estancan durante días hasta que un transeúnte dice dos palabras que los lanzan a toda velocidad. ¿Cuáles fueron?',
   'Cambiad camellos',
   '["Corred hacia atrás", "Empezad de nuevo", "Ganan ambos"]',
   'El premio es para el dueño del camello más lento. Montando tu propio camello, ir rápido solo te perjudica. Pero sobre el camello del rival, cada gota de velocidad que le saques hace que SU camello llegue primero y que el tuyo, montado por él, llegue último y te dé el premio. Intercambiar monturas invierte el incentivo de cada jinete de frenar a esprintar sin cambiar qué camello gana.',
   5),

  ('A windowless room%',
   'Una habitación sin ventanas tiene una puerta y ninguna luz. Diez personas esconden una moneda cada una dentro, de una en una, sin ver el escondite de las demás. Luego cada una debe encontrar una moneda —cualquiera— y el grupo triunfa solo si todas encuentran una. Pueden acordar un plan antes. ¿Qué plan garantiza el éxito?',
   'Que todas escondan su moneda en el mismo lugar acordado',
   '["Que todas registren la habitación en la misma dirección", "Que cada una memorice su lugar y recupere su propia moneda", "No se puede garantizar el éxito"]',
   'La libertad del puzle es que nadie necesita encontrar SU moneda. Acordad de antemano un punto —digamos, justo detrás de la puerta— y las diez monedas acaban en un solo montón que cualquiera encuentra al tacto. «Recuperar la propia» también sirve para encontrar, pero el plan del montón común es el que no puede fallarle a nadie, a oscuras y sin exigir memoria.',
   4)
) AS seed(en_prefix, q, a, w, x, d)
WHERE NOT EXISTS (
  SELECT 1 FROM public.king_questions WHERE source = 'seed-es-1'
);


INSERT INTO public.king_questions
  (language, translated_from, question_text, correct_answer, incorrect_answers, explanation, difficulty, source, is_active)
SELECT
  'de',
  (SELECT e.id FROM public.king_questions e
    WHERE e.source = 'seed-en-1' AND e.question_text LIKE seed.en_prefix
    LIMIT 1),
  seed.q, seed.a, seed.w::jsonb, seed.x, seed.d, 'seed-de-1', true
FROM (VALUES
  ('You have two ropes%',
   'Du hast zwei Seile. Jedes brennt in genau einer Stunde von Ende zu Ende ab, aber ungleichmäßig — das halbe Seil bedeutet nicht die halbe Stunde. Wie misst du nur mit diesen Seilen und einem Feuerzeug genau 45 Minuten?',
   'Zünde Seil A an beiden Enden und Seil B an einem an; wenn A weg ist, zünde Bs anderes Ende an',
   '["Verbrenne Seil A, dann die Hälfte von Seil B", "Falte Seil A in der Mitte und verbrenne es neben Seil B", "Zünde beide Seile an einem Ende an und stoppe, wenn A zu drei Vierteln weg ist"]',
   'Ein an beiden Enden angezündetes Seil ist nach 30 Minuten verbraucht, egal wie ungleichmäßig es brennt — die beiden Flammen treffen sich immer nach der halben Gesamtzeit. Wenn A erlischt, sind genau 30 Minuten vergangen, und B (an einem Ende brennend) hat noch 30 Minuten. Zündet man in dem Moment Bs anderes Ende an, halbiert sich der Rest auf 15. 30 + 15 = 45. Die falschen Optionen setzen alle voraus, dass die Seillänge etwas bedeutet — genau das nimmt das ungleichmäßige Brennen weg.',
   4),

  ('A snail climbs%',
   'Eine Schnecke klettert einen 10-Meter-Pfahl hinauf. Jeden Tag schafft sie 3 Meter; jede Nacht rutscht sie 2 zurück. An welchem Tag erreicht sie die Spitze?',
   'Am 8. Tag',
   '["Am 10. Tag", "Am 7. Tag", "Am 9. Tag"]',
   'Die Falle ist, jeden Tag als netto +1 zu rechnen. Das gilt nur, solange die Schnecke den Tag unterhalb der Spitze beendet. Nach 7 vollen Tagen und Nächten steht sie bei 7 Metern. Am 8. Tag klettert sie 3 und berührt die 10 — sie ist oben, bevor die Nacht sie rutschen lässt. „Tag 10“ ist die Antwort der reinen Netto-Arithmetik; die anderen verorten falsch, wo das Muster bricht.',
   2),

  ('Three switches%',
   'Drei Schalter vor einem geschlossenen Raum steuern drei Lampen darin. Du darfst beliebig schalten, aber die Tür nur einmal öffnen. Wie findest du heraus, welcher Schalter welche Lampe steuert?',
   'Lass einen Schalter eine Weile an, schalte ihn aus, den zweiten ein, dann hinein: warme, leuchtende, kalte Lampe',
   '["Schalte jeden Schalter schnell und lausche den Glühfäden", "Schalte zwei ein und schließe aus den zwei leuchtenden", "Mit einem einzigen Besuch ist es unmöglich"]',
   'Licht ist nicht das einzige Signal einer Lampe — eine Lampe, die an war, trägt auch Wärme. Lass Schalter 1 ein paar Minuten laufen, schalte ihn aus, Schalter 2 ein, und geh hinein: die leuchtende Lampe ist 2, die dunkle-aber-warme ist 1, die dunkle-und-kalte ist 3. Zwei eingeschaltete Schalter liefern nur zwei benannte Lampen und einen Rest zum Raten — die Variante, die ausreichend wirkt, aber ein Bit Information zu kurz greift.',
   3),

  ('In a running race%',
   'In einem Wettlauf überholst du den Läufer auf Platz zwei. Auf welchem Platz bist du jetzt?',
   'Zweiter',
   '["Erster", "Dritter", "Kommt auf die Zahl der Läufer an"]',
   'Wer jemanden überholt, übernimmt dessen Platz. Der Überholte war Zweiter, also bist du jetzt Zweiter und er Dritter. „Erster“ kommt vom Gefühl, dass Überholen vorn zum Führenden macht — aber den Führenden hast du nie überholt.',
   1),

  ('A father is 36%',
   'Ein Vater ist 36, sein Kind 6. In wie vielen Jahren ist der Vater genau dreimal so alt wie das Kind?',
   'In 9 Jahren',
   '["In 6 Jahren", "In 12 Jahren", "In 15 Jahren"]',
   'Sei x die Zahl der Jahre: 36 + x = 3 × (6 + x), also 36 + x = 18 + 3x, ergibt x = 9. Probe: 45 und 15. Der Altersabstand von 30 Jahren ändert sich nie, also ist der Vater genau dann dreimal so alt, wenn das Kind die Hälfte dieses Abstands erreicht — 15. Die falschen Optionen teilen das Falsche: 36/6 legt 6 nahe, Verdoppeln oder Halbieren der Alter 12 und 15.',
   3),

  ('You have a 5-liter jug%',
   'Du hast einen 5-Liter-Krug, einen 3-Liter-Krug und einen Brunnen. Wie erhältst du genau 4 Liter?',
   'Fülle 5, gieße in 3, leere 3, gieße die 2 hinüber, fülle 5 neu, fülle 3 auf — 4 bleiben zurück',
   '["Fülle den 3er und gib ein Drittel in den vollen 5er", "Fülle beide und schütte die Hälfte des Ganzen weg", "Fülle den 5er und gieße ungefähr ein Fünftel ab"]',
   'Fülle den 5er und gieße in den 3er: im großen Krug bleiben genau 2. Leere den 3er und fülle die 2 hinein — im kleinen ist jetzt Platz für genau 1. Fülle den 5er neu und gieße den 3er voll: genau 1 Liter verlässt den großen Krug, und genau 4 bleiben. Jeder Schritt ist exakt, weil er einen Krug ganz füllt oder ganz leert; die falschen Optionen verlangen, eine Menge nach Augenmaß zu treffen — dafür gibt das Rätsel kein Werkzeug.',
   3),

  ('A farmer has 17 sheep%',
   'Ein Bauer hat 17 Schafe. Alle bis auf 9 laufen davon. Wie viele bleiben?',
   '9',
   '["8", "17", "Keines"]',
   '„Alle bis auf 9“ heißt „alle außer 9“ — die 9 sind die, die geblieben sind. Der Reflex ist zu subtrahieren (17 − 9 = 8), weil der Satz wie eine Minus-Aufgabe klingt, aber die 9 zählte nie die Weggelaufenen.',
   1),

  ('If 5 machines%',
   'Wenn 5 Maschinen 5 Minuten für 5 Teile brauchen, wie lange brauchen 100 Maschinen für 100 Teile?',
   '5 Minuten',
   '["100 Minuten", "20 Minuten", "1 Minute"]',
   'Aus dem Aufbau folgt: Eine Maschine macht ein Teil in 5 Minuten. Hundert Maschinen, die je ihr eigenes Teil bauen, brauchen weiter 5 Minuten — die Arbeit ist perfekt parallel. „100 Minuten“ entsteht durch Musterabgleich der Zahlen (5-5-5 → 100-100-100); der Rest durch Teilen von Dingen, die man nicht teilen darf.',
   2),

  ('A patch of lily pads%',
   'Ein Teppich aus Seerosen verdoppelt seine Fläche jeden Tag. Am Tag 48 bedeckt er den ganzen See. An welchem Tag bedeckte er die Hälfte?',
   'Am Tag 47',
   '["Am Tag 24", "Am Tag 46", "Am Tag 12"]',
   'Tägliches Verdoppeln heißt: Am Tag vor der vollen Bedeckung war es genau die Hälfte — Tag 47. „Tag 24“ ist die Antwort linearen Wachstums, die die Zeit halbiert statt eine Verdopplung rückgängig zu machen. Exponentielle Prozesse sehen fast die ganze Zeit klein aus — genau deshalb fühlt sich das falsch an.',
   2),

  ('A bat and a ball%',
   'Schläger und Ball kosten zusammen 110 Münzen. Der Schläger kostet 100 Münzen mehr als der Ball. Was kostet der Ball?',
   '5 Münzen',
   '["10 Münzen", "15 Münzen", "1 Münze"]',
   'Kostet der Ball b, kostet der Schläger b + 100, zusammen: 2b + 100 = 110, also b = 5. Probe: 5 + 105 = 110, Differenz genau 100. Das spontane „10“ erfüllt die Summe, macht die Differenz aber nur 90 — es liest „100 mehr“ als „der Schläger kostet 100“.',
   2),

  ('A man looks at a portrait%',
   'Ein Mann betrachtet ein Porträt und sagt: „Brüder und Schwestern habe ich keine, doch der Vater dieses Mannes ist meines Vaters Sohn.“ Wer ist auf dem Porträt?',
   'Sein Sohn',
   '["Er selbst", "Sein Vater", "Sein Bruder"]',
   'Von innen nach außen: „meines Vaters Sohn“ ist für einen Mann ohne Geschwister er selbst. Eingesetzt: „der Vater dieses Mannes bin ICH“ — das Porträt zeigt also seinen Sohn. „Er selbst“ ist, wonach der Satz vor dem Einsetzen klingt; „sein Bruder“ scheidet im ersten Halbsatz aus.',
   3),

  ('You have 8 identical-looking balls%',
   'Du hast 8 gleich aussehende Kugeln; eine ist etwas schwerer. Wie viele Wägungen mit einer Balkenwaage brauchst du im schlimmsten Fall, um sie sicher zu finden?',
   '2',
   '["3", "4", "7"]',
   'Wiege 3 gegen 3. Bei Gleichstand ist die schwere Kugel eine der 2 beiseitegelegten — eine weitere Wägung entscheidet. Senkt sich eine Seite, ist sie unter diesen 3: Wiege 1 gegen 1, entweder senkt sich eine, oder es ist die dritte. Jede Wägung hat drei Ausgänge (links, rechts, Gleichstand) und drittelt daher die Kandidaten, statt sie zu halbieren — die „3“ stammt vom Halbieren wie bei einer Ja/Nein-Frage.',
   4),

  ('At six o''clock a clock%',
   'Um sechs Uhr braucht eine Uhr 5 Sekunden für 6 Schläge. Wie lange braucht sie um Mitternacht für 12 Schläge?',
   '11 Sekunden',
   '["10 Sekunden", "12 Sekunden", "6 Sekunden"]',
   'Zeit kosten nicht die Schläge, sondern die Pausen dazwischen. Sechs Schläge haben 5 Pausen, jede dauert also 1 Sekunde. Zwölf Schläge haben 11 Pausen: 11 Sekunden. „10“ verdoppelt die Ausgangszeit — und unterstellt damit stillschweigend, 6 Schläge hätten 6 Pausen.',
   3),

  ('Two fathers and two sons%',
   'Zwei Väter und zwei Söhne teilen sich drei Äpfel, und jeder isst genau einen ganzen. Wie ist das möglich?',
   'Es sind Großvater, Vater und Sohn — drei Personen',
   '["Ein Apfel wurde geteilt", "Einer aß zwei", "Es ist unmöglich"]',
   '„Zwei Väter und zwei Söhne“ müssen nicht vier Personen sein. Großvater, Sohn und Enkel enthalten zwei Väter (Großvater, Vater) und zwei Söhne (Vater, Sohn) in drei Personen — der Mittlere zählt doppelt. Drei Personen, drei Äpfel, je einer. Jede falsche Option behält stillschweigend die Annahme von vier Personen bei.',
   2),

  ('How many times can you subtract%',
   'Wie oft kannst du 10 von 100 abziehen?',
   'Einmal',
   '["Zehnmal", "Neunmal", "Beliebig oft"]',
   'Nach dem ersten Abziehen ziehst du nicht mehr von 100 ab, sondern von 90. Die Frage betrifft ausdrücklich das Abziehen von 100 — das geht nur einmal. „Zehnmal“ beantwortet eine andere Frage: wie viele Schritte, bis nichts mehr übrig ist.',
   2),

  ('A fair coin%',
   'Eine faire Münze zeigte 9-mal in Folge Kopf. Wie groß ist die Chance, dass der nächste Wurf wieder Kopf zeigt?',
   'Genau 1 zu 2',
   '["Weniger als 1 zu 2 — Zahl ist überfällig", "Mehr als 1 zu 2 — die Münze hat einen Lauf", "1 zu 1024"]',
   'Die Münze hat kein Gedächtnis: Jeder Wurf einer fairen Münze ist 1/2, egal was vorher war. „Zahl ist überfällig“ ist der Spielerfehlschluss; „hat einen Lauf“ derselbe Fehlschluss andersherum. 1/1024 ist die Wahrscheinlichkeit von zehn Köpfen in Folge VOR dem ersten Wurf — nicht die eines weiteren Kopfs, wenn neun schon liegen.',
   2),

  ('Five people meet%',
   'Fünf Personen treffen sich, und jede gibt jeder anderen genau einmal die Hand. Wie viele Handschläge sind das?',
   '10',
   '["25", "20", "5"]',
   'Jede der 5 Personen schüttelt 4 Hände, das zählt 5 × 4 = 20 — aber so wird jeder Handschlag doppelt gezählt, von beiden Enden. Also 20 / 2 = 10. „25“ ist 5 × 5 (da schütteln Leute die eigene Hand); „20“ vergisst die Doppelzählung; „5“ stellt sie in eine Reihe.',
   2),

  ('What is the minimum number of ducks%',
   'Wie viele Enten braucht es mindestens, damit eine Ente vor zwei Enten steht, eine Ente hinter zwei Enten und eine Ente zwischen zwei Enten?',
   '3',
   '["5", "4", "6"]',
   'Drei Enten im Gänsemarsch erledigen alle drei Rollen zugleich: Die erste steht vor den anderen beiden, die letzte hinter den anderen beiden, die mittlere zwischen zweien. Die Beschreibungen klingen nach drei getrennten Szenen mit eigenen Enten — es ist eine Szene, dreimal beschrieben.',
   3),

  ('A brick weighs%',
   'Ein Ziegelstein wiegt ein Kilogramm plus einen halben Ziegelstein. Wie schwer ist der ganze Ziegelstein?',
   '2 Kilogramm',
   '["1,5 Kilogramm", "1 Kilogramm", "3 Kilogramm"]',
   'Nenne den Ziegel w: w = 1 + w/2, also w/2 = 1 und w = 2. Probe: 1 kg plus die Hälfte von 2 kg sind 2 kg. „1,5“ entsteht, wenn man „einen halben Ziegelstein“ als festes halbes Kilo liest statt als Hälfte der gesuchten Unbekannten.',
   3),

  ('On the first of January%',
   'Am ersten Januar sagt ein Mädchen: „Vorgestern war ich 17, und nächstes Jahr werde ich 20.“ Wann hat sie Geburtstag?',
   'Am 31. Dezember',
   '["Am 1. Januar", "Am 2. Januar", "Das ist unmöglich"]',
   'Sie spricht am 1. Januar. Vorgestern — am 30. Dezember — war sie noch 17. Am 31. Dezember wurde sie 18. DIESES Jahr wird sie am 31. Dezember 19, und nächstes Jahr 20. Alles stimmt nur, wenn der Geburtstag der 31. Dezember ist und am 1. Januar gesprochen wird — das eine Datum, an dem „nächstes Jahr“ zwei Geburtstage entfernt liegt.',
   5),

  ('A rowing boat hangs a rope ladder%',
   'Ein Ruderboot hängt eine Strickleiter über die Bordwand; die Sprossen liegen 30 cm auseinander, mittags sind zehn unter Wasser. Bis zum Abend steigt die Flut um 90 cm. Wie viele Sprossen sind dann unter Wasser?',
   'Immer noch zehn',
   '["Dreizehn", "Sieben", "Zwölf"]',
   'Das Boot schwimmt — steigt die Flut, steigen Boot und Leiter mit, und die Lage der Leiter zum Wasser ändert sich nie. „Dreizehn“ (10 + 90/30) ist die Antwort für eine am Meeresboden verschraubte Leiter — genau das Bild, zu dem die Frage stillschweigend einlädt.',
   2),

  ('You are given three boxes%',
   'Du bekommst drei Kisten mit den Etiketten ÄPFEL, ORANGEN und GEMISCHT — und die Auskunft, dass jedes Etikett falsch ist. Wie beschriftest du mit einem einzigen gezogenen Stück Obst alle drei richtig?',
   'Ziehe aus der Kiste GEMISCHT; ihre Frucht benennt sie, die anderen beiden tauschen',
   '["Ziehe aus der Kiste mit dem Etikett ÄPFEL", "Ziehe je eine Frucht aus zwei Kisten", "Mit einem Zug ist es unmöglich"]',
   'Die Kiste mit dem Etikett GEMISCHT kann nicht gemischt sein, also benennt die eine gezogene Frucht ihren wahren, einheitlichen Inhalt — sagen wir Äpfel. Die Kiste ORANGEN kann dann weder Orangen (eigenes Etikett) noch Äpfel (vergeben) sein, ist also die gemischte, und die letzte enthält Orangen. Bei ÄPFEL zu beginnen lehrt weniger: Eine gezogene Orange lässt zwei Möglichkeiten offen. Der starke Zug ist, aus dem Etikett zu ziehen, das am vollständigsten lügt.',
   4),

  ('A rich eccentric%',
   'Ein reicher Exzentriker setzt einen Preis auf das LANGSAMERE Kamel aus: Zwei Reiter sollen ein Rennen reiten, und es gewinnt, wessen Kamel zuletzt die Linie quert. Tagelang trödeln beide, bis ein Passant zwei Worte sagt, die beide in vollem Tempo losreiten lassen. Welche?',
   'Tauscht Kamele',
   '["Reitet rückwärts", "Fangt neu an", "Beide gewinnen"]',
   'Der Preis geht an den Besitzer des langsameren Kamels. Auf dem eigenen Kamel kann Tempo nur schaden. Auf dem Kamel des Rivalen aber lässt jedes herausgekitzelte Tempo DESSEN Kamel zuerst ankommen — und das eigene, von ihm geritten, zuletzt: Es gewinnt den Preis. Der Tausch kehrt den Anreiz beider Reiter vom Trödeln zum Sprinten um, ohne zu ändern, wessen Kamel gewinnt.',
   5),

  ('A windowless room%',
   'Ein fensterloser Raum hat eine Tür und kein Licht. Zehn Menschen verstecken darin nacheinander je eine Münze, ohne die Verstecke der anderen zu sehen. Danach muss jeder eine Münze finden — irgendeine — und die Gruppe gewinnt nur, wenn alle eine finden. Vorher dürfen sie einen Plan absprechen. Welcher Plan garantiert den Erfolg?',
   'Alle verstecken ihre Münze am selben vereinbarten Ort',
   '["Alle durchsuchen den Raum in derselben Richtung", "Jeder merkt sich sein Versteck und holt die eigene Münze", "Erfolg lässt sich nicht garantieren"]',
   'Die Freiheit des Rätsels: Niemand muss die EIGENE Münze finden. Vereinbart vorher einen Ort — etwa direkt hinter der Tür — und alle zehn Münzen landen auf einem Haufen, den jeder blind ertastet. „Die eigene holen“ würde zum Finden auch reichen, aber der gemeinsame Haufen ist der Plan, der im Dunkeln niemandem misslingen kann und kein Gedächtnis verlangt.',
   4)
) AS seed(en_prefix, q, a, w, x, d)
WHERE NOT EXISTS (
  SELECT 1 FROM public.king_questions WHERE source = 'seed-de-1'
);


INSERT INTO public.king_questions
  (language, translated_from, question_text, correct_answer, incorrect_answers, explanation, difficulty, source, is_active)
SELECT
  'fr',
  (SELECT e.id FROM public.king_questions e
    WHERE e.source = 'seed-en-1' AND e.question_text LIKE seed.en_prefix
    LIMIT 1),
  seed.q, seed.a, seed.w::jsonb, seed.x, seed.d, 'seed-fr-1', true
FROM (VALUES
  ('You have two ropes%',
   'Tu as deux cordes. Chacune met exactement une heure à brûler d''un bout à l''autre, mais de façon irrégulière — la moitié de la corde ne vaut pas la moitié de l''heure. Avec ces seules cordes et un briquet, comment mesurer exactement 45 minutes ?',
   'Allume la corde A par les deux bouts et la B par un seul ; quand A est finie, allume l''autre bout de B',
   '["Brûle la corde A, puis la moitié de la corde B", "Plie la corde A en deux et brûle-la à côté de la B", "Allume les deux cordes par un bout et arrête-toi quand A est aux trois quarts consumée"]',
   'Une corde allumée par les deux bouts se consume en 30 minutes, si irrégulière soit-elle — les deux flammes se rejoignent toujours à la moitié du temps total. Quand A s''éteint, 30 minutes exactement ont passé et B (allumée par un bout) a encore 30 minutes devant elle. Allumer son autre bout à cet instant réduit le reste à 15. 30 + 15 = 45. Les mauvaises options supposent toutes que la longueur signifie quelque chose — précisément ce que la combustion irrégulière retire.',
   4),

  ('A snail climbs%',
   'Un escargot grimpe un poteau de 10 mètres. Chaque jour il monte de 3 mètres ; chaque nuit il glisse de 2. Quel jour atteint-il le sommet ?',
   'Le 8e jour',
   '["Le 10e jour", "Le 7e jour", "Le 9e jour"]',
   'Le piège est de compter chaque jour comme +1 net. Cela ne vaut que tant que l''escargot finit sa journée sous le sommet. Après 7 jours et nuits complets, il est à 7 mètres. Le 8e jour il monte de 3 et touche les 10 — il est en haut avant que la nuit ne le fasse glisser. « Le 10e jour » est la réponse de l''arithmétique du progrès net ; les autres placent mal l''endroit où le motif se casse.',
   2),

  ('Three switches%',
   'Trois interrupteurs devant une pièce fermée commandent trois lampes à l''intérieur. Tu peux les actionner autant que tu veux, mais tu ne peux ouvrir la porte qu''une seule fois. Comment savoir quel interrupteur commande quelle lampe ?',
   'Laisse-en un allumé un moment, éteins-le, allume le deuxième, puis entre : lampe chaude, allumée, froide',
   '["Bascule chaque interrupteur vite et écoute les filaments", "Allumes-en deux et déduis d''après les deux lampes allumées", "Impossible en une seule visite"]',
   'La lumière n''est pas le seul signal d''une lampe — une lampe restée allumée garde aussi de la chaleur. Laisse l''interrupteur 1 quelques minutes, éteins-le, allume le 2 et entre : la lampe allumée est la 2, l''éteinte-mais-chaude la 1, l''éteinte-et-froide la 3. Deux interrupteurs allumés ne nomment que deux lampes et laissent une devinette — la version qui semble suffisante mais manque d''un bit d''information.',
   3),

  ('In a running race%',
   'Dans une course, tu doubles le coureur en deuxième position. Quelle est ta position maintenant ?',
   'Deuxième',
   '["Premier", "Troisième", "Ça dépend du nombre de coureurs"]',
   'Doubler quelqu''un te place à la position qu''il occupait. Celui que tu as dépassé était deuxième : tu es donc deuxième et lui troisième. « Premier » vient du sentiment que dépasser quelqu''un près de la tête fait de toi le leader — mais tu n''as jamais dépassé le leader.',
   1),

  ('A father is 36%',
   'Un père a 36 ans et son enfant 6. Dans combien d''années le père aura-t-il exactement trois fois l''âge de l''enfant ?',
   '9 ans',
   '["6 ans", "12 ans", "15 ans"]',
   'Soit x le nombre d''années : 36 + x = 3 × (6 + x), donc 36 + x = 18 + 3x, d''où x = 9. Vérification : 45 et 15. L''ÉCART de 30 ans ne change jamais : le père a le triple exactement quand l''enfant atteint la moitié de cet écart — 15 ans. Les mauvaises options divisent ce qu''il ne faut pas : 36/6 suggère 6, doubler ou couper les âges suggère 12 et 15.',
   3),

  ('You have a 5-liter jug%',
   'Tu as une cruche de 5 litres, une de 3 litres et une fontaine. Comment obtenir exactement 4 litres ?',
   'Remplis la 5, verse dans la 3, vide la 3, transvase les 2, re-remplis la 5, complète la 3 — il reste 4',
   '["Remplis la cruche de 3 et ajoute-en un tiers à la 5 pleine", "Remplis les deux et jette la moitié du total", "Remplis la 5 et verse à peu près un cinquième"]',
   'Remplis la 5 et verse dans la 3 : la grande garde exactement 2. Vide la 3 et transvase les 2 — il reste exactement 1 litre de place dans la petite. Re-remplis la 5 et complète la 3 : exactement 1 litre quitte la grande cruche, il en reste exactement 4. Chaque étape est exacte parce qu''elle remplit ou vide une cruche en entier ; les mauvaises options exigent d''estimer une fraction à l''œil, ce que l''énigme ne permet pas.',
   3),

  ('A farmer has 17 sheep%',
   'Un fermier a 17 moutons. Tous s''enfuient sauf 9. Combien en reste-t-il ?',
   '9',
   '["8", "17", "Aucun"]',
   '« Tous sauf 9 » signifie que les 9 sont ceux qui sont restés. Le réflexe est de soustraire (17 − 9 = 8) parce que la phrase a le rythme d''une soustraction, mais le 9 n''a jamais compté ceux qui partaient.',
   1),

  ('If 5 machines%',
   'Si 5 machines mettent 5 minutes à faire 5 pièces, combien de temps mettent 100 machines à faire 100 pièces ?',
   '5 minutes',
   '["100 minutes", "20 minutes", "1 minute"]',
   'D''après l''énoncé, une machine fait une pièce en 5 minutes. Cent machines faisant chacune la sienne mettent toujours 5 minutes — le travail est parfaitement parallèle. « 100 minutes » vient du calquage des nombres (5-5-5 → 100-100-100) ; les autres, de divisions qui n''ont pas lieu d''être.',
   2),

  ('A patch of lily pads%',
   'Un tapis de nénuphars double de surface chaque jour. Il couvre tout le lac le 48e jour. Quel jour en couvrait-il la moitié ?',
   'Le 47e jour',
   '["Le 24e jour", "Le 46e jour", "Le 12e jour"]',
   'Doubler chaque jour signifie que la veille de la couverture totale, c''était exactement la moitié : le 47e jour. « Le 24e » est la réponse de la croissance linéaire — couper le temps en deux au lieu d''annuler un doublement. L''exponentiel passe presque tout son temps à paraître petit, et c''est exactement pourquoi la bonne réponse semble étrange.',
   2),

  ('A bat and a ball%',
   'Une batte et une balle coûtent ensemble 110 pièces. La batte coûte 100 pièces de plus que la balle. Combien coûte la balle ?',
   '5 pièces',
   '["10 pièces", "15 pièces", "1 pièce"]',
   'Si la balle coûte b, la batte coûte b + 100, et ensemble : 2b + 100 = 110, donc b = 5. Vérification : 5 + 105 = 110 et l''écart fait exactement 100. Le « 10 » immédiat satisfait le total mais ramène l''écart à 90 — il lit « 100 de plus » comme « la batte vaut 100 ».',
   2),

  ('A man looks at a portrait%',
   'Un homme regarde un portrait et dit : « Je n''ai ni frère ni sœur, mais le père de cet homme est le fils de mon père. » Qui est sur le portrait ?',
   'Son fils',
   '["Lui-même", "Son père", "Son frère"]',
   'Résous de l''intérieur : « le fils de mon père », pour un homme sans fratrie, c''est lui-même. Substitue : « le père de cet homme, c''est MOI » — le portrait montre donc son fils. « Lui-même » est ce que la phrase semble dire avant la substitution ; « son frère » est écarté dès la première proposition.',
   3),

  ('You have 8 identical-looking balls%',
   'Tu as 8 boules d''apparence identique ; l''une est un peu plus lourde. Avec une balance à plateaux, combien de pesées faut-il, au pire, pour la trouver à coup sûr ?',
   '2',
   '["3", "4", "7"]',
   'Pèse 3 contre 3. Si ça s''équilibre, la lourde est parmi les 2 mises de côté — une pesée de plus tranche. Si un plateau descend, elle est parmi ces 3 : pèse 1 contre 1, soit l''une descend, soit c''est la troisième. Chaque pesée a trois issues (gauche, droite, équilibre) : elle divise donc les candidats par trois, pas par deux — le « 3 » vient d''une division par deux, comme pour une question par oui ou non.',
   4),

  ('At six o''clock a clock%',
   'À six heures, une horloge met 5 secondes à sonner 6 coups. Combien de temps met-elle à sonner 12 coups à minuit ?',
   '11 secondes',
   '["10 secondes", "12 secondes", "6 secondes"]',
   'Ce qui prend du temps, ce ne sont pas les coups mais les intervalles entre eux. Six coups font 5 intervalles, chacun dure donc 1 seconde. Douze coups font 11 intervalles : 11 secondes. « 10 » double le temps initial — ce qui suppose en silence que 6 coups font 6 intervalles.',
   3),

  ('Two fathers and two sons%',
   'Deux pères et deux fils se partagent trois pommes, et chacun mange exactement une pomme entière. Comment est-ce possible ?',
   'Ce sont un grand-père, un père et un fils — trois personnes',
   '["Une pomme a été coupée et partagée", "L''un d''eux en a mangé deux", "C''est impossible"]',
   '« Deux pères et deux fils » n''implique pas quatre personnes. Un grand-père, son fils et son petit-fils contiennent deux pères (grand-père, père) et deux fils (père, fils) en trois personnes — celui du milieu compte deux fois. Trois personnes, trois pommes, une chacun. Chaque mauvaise option garde en silence l''hypothèse des quatre personnes.',
   2),

  ('How many times can you subtract%',
   'Combien de fois peux-tu soustraire 10 de 100 ?',
   'Une fois',
   '["Dix fois", "Neuf fois", "Autant qu''on veut"]',
   'Après la première soustraction, tu ne soustrais plus de 100 mais de 90. La question porte précisément sur soustraire de 100, ce qui ne peut arriver qu''une fois. « Dix fois » répond à une autre question : combien d''étapes avant qu''il ne reste rien.',
   2),

  ('A fair coin%',
   'Une pièce équilibrée est tombée 9 fois de suite sur face. Quelle est la probabilité que le prochain lancer donne encore face ?',
   'Exactement 1 sur 2',
   '["Moins de 1 sur 2 — pile est en retard", "Plus de 1 sur 2 — la pièce est en série", "1 sur 1024"]',
   'La pièce n''a pas de mémoire : chaque lancer d''une pièce équilibrée vaut 1/2, quel que soit l''historique. « Pile est en retard », c''est le sophisme du joueur ; « en série », le même sophisme dans l''autre sens. 1/1024 est la probabilité de dix faces d''affilée calculée AVANT tout lancer — pas celle d''une face de plus quand neuf sont déjà acquises.',
   2),

  ('Five people meet%',
   'Cinq personnes se rencontrent et chacune serre la main de chacune des autres exactement une fois. Combien de poignées de main ?',
   '10',
   '["25", "20", "5"]',
   'Chacune des 5 personnes serre 4 mains, soit 5 × 4 = 20 — mais chaque poignée est ainsi comptée deux fois, une par extrémité. Donc 20 / 2 = 10. « 25 », c''est 5 × 5 (chacun se serrant la main à lui-même) ; « 20 » oublie le double comptage ; « 5 » les imagine en file.',
   2),

  ('What is the minimum number of ducks%',
   'Quel est le nombre minimal de canards pour qu''il y ait un canard devant deux canards, un canard derrière deux canards et un canard entre deux canards ?',
   '3',
   '["5", "4", "6"]',
   'Trois canards à la file remplissent les trois rôles à la fois : le premier est devant les deux autres, le dernier derrière les deux autres, celui du milieu entre deux. Les descriptions sonnent comme trois scènes distinctes exigeant leurs propres canards — c''est une seule scène décrite trois fois.',
   3),

  ('A brick weighs%',
   'Une brique pèse un kilogramme plus une demi-brique. Combien pèse la brique entière ?',
   '2 kilogrammes',
   '["1,5 kilogramme", "1 kilogramme", "3 kilogrammes"]',
   'Appelle la brique w : w = 1 + w/2, donc w/2 = 1 et w = 2. Vérification : 1 kg plus la moitié de 2 kg font 2 kg. « 1,5 » vient de lire « une demi-brique » comme un demi-kilo fixe au lieu de la moitié de l''inconnue qu''on cherche.',
   3),

  ('On the first of January%',
   'Le premier janvier, une fille dit : « Avant-hier j''avais 17 ans, et l''année prochaine j''en aurai 20. » Quand est son anniversaire ?',
   'Le 31 décembre',
   '["Le 1er janvier", "Le 2 janvier", "C''est impossible"]',
   'Elle parle le 1er janvier. Avant-hier — le 30 décembre — elle avait encore 17 ans. Le 31 décembre, elle en a eu 18. CETTE année, le 31 décembre, elle en aura 19, et l''année prochaine 20. Tout ne colle que si l''anniversaire tombe le 31 décembre et que les mots sont dits le 1er janvier — la seule date où « l''année prochaine » empile deux anniversaires de distance.',
   5),

  ('A rowing boat hangs a rope ladder%',
   'Une barque laisse pendre une échelle de corde ; les barreaux sont espacés de 30 cm et dix sont sous l''eau à midi. La marée monte de 90 cm d''ici le soir. Combien de barreaux sont alors sous l''eau ?',
   'Toujours dix',
   '["Treize", "Sept", "Douze"]',
   'La barque flotte — quand la marée monte, la barque et son échelle montent avec elle, et la position de l''échelle par rapport à l''eau ne change jamais. « Treize » (10 + 90/30) est la réponse pour une échelle vissée au fond de la mer — exactement l''image que la question invite en silence à dessiner.',
   2),

  ('You are given three boxes%',
   'On te donne trois boîtes étiquetées POMMES, ORANGES et MÉLANGE — et l''on t''assure que toutes les étiquettes sont fausses. En tirant un seul fruit d''une seule boîte, comment ré-étiqueter les trois correctement ?',
   'Tire de la boîte MÉLANGE ; son fruit la nomme, et les deux autres s''échangent',
   '["Tire de la boîte étiquetée POMMES", "Tire un fruit de chacune de deux boîtes", "Impossible en un seul tirage"]',
   'La boîte étiquetée MÉLANGE ne peut pas être mélangée : le fruit que tu en tires nomme donc son vrai contenu, unique — disons des pommes. La boîte ORANGES ne peut alors être ni oranges (sa propre étiquette) ni pommes (déjà prises) : c''est le mélange, et la dernière contient les oranges. Commencer par POMMES apprend moins : une orange tirée laisse deux possibilités ouvertes. Le coup fort, c''est de tirer de l''étiquette qui ment le plus complètement.',
   4),

  ('A rich eccentric%',
   'Un riche excentrique promet un prix au chameau le PLUS LENT : deux cavaliers doivent courir, et celui dont le chameau franchit la ligne en dernier gagne. Les cavaliers traînent pendant des jours, jusqu''à ce qu''un passant dise deux mots qui les lancent à pleine vitesse. Lesquels ?',
   'Échangez vos chameaux',
   '["Courez à reculons", "Recommencez", "Les deux gagnent"]',
   'Le prix va au propriétaire du chameau le plus lent. Sur ta propre monture, aller vite ne peut que te nuire. Mais sur le chameau du rival, chaque once de vitesse que tu en tires fait arriver SON chameau en premier — et le tien, monté par lui, en dernier : le prix est pour toi. Échanger les montures renverse l''intérêt de chaque cavalier, du surplace au sprint, sans rien changer à quel chameau gagne.',
   5),

  ('A windowless room%',
   'Une pièce sans fenêtre a une porte et aucune lumière. Dix personnes y cachent chacune une pièce de monnaie, une par une, sans voir la cachette des autres. Puis chacune doit trouver une pièce — n''importe laquelle — et le groupe ne réussit que si tout le monde en trouve une. Un plan peut être convenu à l''avance. Lequel garantit la réussite ?',
   'Que tout le monde cache sa pièce au même endroit convenu',
   '["Que tout le monde fouille la pièce dans le même sens", "Que chacun mémorise sa cachette et récupère sa propre pièce", "La réussite ne peut pas être garantie"]',
   'La liberté de l''énigme : personne n''a besoin de retrouver SA pièce. Convenez d''un endroit à l''avance — disons juste derrière la porte — et les dix pièces finissent en un seul tas que chacun trouve au toucher. « Récupérer la sienne » marcherait aussi pour trouver, mais le tas commun est le plan qui ne peut échouer pour personne, dans le noir, sans rien exiger de la mémoire.',
   4)
) AS seed(en_prefix, q, a, w, x, d)
WHERE NOT EXISTS (
  SELECT 1 FROM public.king_questions WHERE source = 'seed-fr-1'
);


INSERT INTO public.king_questions
  (language, translated_from, question_text, correct_answer, incorrect_answers, explanation, difficulty, source, is_active)
SELECT
  'it',
  (SELECT e.id FROM public.king_questions e
    WHERE e.source = 'seed-en-1' AND e.question_text LIKE seed.en_prefix
    LIMIT 1),
  seed.q, seed.a, seed.w::jsonb, seed.x, seed.d, 'seed-it-1', true
FROM (VALUES
  ('You have two ropes%',
   'Hai due corde. Ciascuna impiega esattamente un''ora a bruciare da un capo all''altro, ma brucia in modo irregolare — metà corda non significa mezz''ora. Usando solo queste corde e un accendino, come misuri esattamente 45 minuti?',
   'Accendi la corda A da entrambi i capi e la B da uno; quando A è finita, accendi l''altro capo di B',
   '["Brucia la corda A, poi metà della corda B", "Piega la corda A a metà e bruciala accanto alla B", "Accendi entrambe da un capo e fermati quando A è a tre quarti"]',
   'Una corda accesa da entrambi i capi si consuma in 30 minuti per quanto irregolarmente bruci — le due fiamme si incontrano sempre a metà del tempo totale. Quando A si spegne sono passati esattamente 30 minuti e a B (accesa da un capo) ne restano 30. Accendere in quell''istante il suo altro capo dimezza il resto a 15. 30 + 15 = 45. Le opzioni sbagliate presumono tutte che la lunghezza conti qualcosa — proprio ciò che la combustione irregolare toglie.',
   4),

  ('A snail climbs%',
   'Una lumaca sale un palo di 10 metri. Ogni giorno sale di 3 metri; ogni notte scivola giù di 2. In che giorno raggiunge la cima?',
   'L''ottavo giorno',
   '["Il decimo giorno", "Il settimo giorno", "Il nono giorno"]',
   'La trappola è trattare ogni giorno come +1 netto. Vale solo finché la lumaca finisce la giornata sotto la cima. Dopo 7 giorni e notti completi è a 7 metri. L''ottavo giorno sale di 3 e tocca i 10 — è in cima prima che la notte la faccia scivolare. «Il decimo» è la risposta dell''aritmetica del progresso netto; le altre sbagliano il punto in cui lo schema si rompe.',
   2),

  ('Three switches%',
   'Tre interruttori fuori da una stanza chiusa comandano tre lampade all''interno. Puoi azionarli quanto vuoi, ma puoi aprire la porta una sola volta. Come capisci quale interruttore comanda quale lampada?',
   'Tieni acceso un interruttore per un po'', spegnilo, accendi il secondo, poi entra: lampada calda, accesa, fredda',
   '["Aziona in fretta ogni interruttore e ascolta i filamenti", "Accendine due e ragiona dalle due lampade accese", "Non si può fare con una sola visita"]',
   'La luce non è l''unico segnale di una lampada — una lampada rimasta accesa porta anche calore. Lascia l''interruttore 1 acceso qualche minuto, spegnilo, accendi il 2 ed entra: la lampada accesa è la 2, quella spenta ma calda è la 1, quella spenta e fredda la 3. Con due interruttori accesi nomini solo due lampade e ne resta una da indovinare — la versione che sembra bastare ma è corta di un bit.',
   3),

  ('In a running race%',
   'In una corsa superi il corridore in seconda posizione. In che posizione sei ora?',
   'Secondo',
   '["Primo", "Terzo", "Dipende da quanti corrono"]',
   'Superare qualcuno ti mette nella posizione che occupava. Chi hai superato era secondo, quindi ora sei secondo e lui terzo. «Primo» nasce dalla sensazione che superare qualcuno davanti ti renda il leader — ma il leader non l''hai mai superato.',
   1),

  ('A father is 36%',
   'Un padre ha 36 anni e suo figlio 6. Fra quanti anni il padre avrà esattamente il triplo dell''età del figlio?',
   '9 anni',
   '["6 anni", "12 anni", "15 anni"]',
   'Sia x il numero di anni: 36 + x = 3 × (6 + x), cioè 36 + x = 18 + 3x, da cui x = 9. Verifica: 45 e 15. Il DIVARIO di 30 anni non cambia mai: il padre è al triplo esattamente quando il figlio raggiunge metà di quel divario — 15. Le opzioni sbagliate dividono le cose sbagliate: 36/6 suggerisce 6, raddoppiare o dimezzare le età suggerisce 12 e 15.',
   3),

  ('You have a 5-liter jug%',
   'Hai una brocca da 5 litri, una da 3 litri e una fontana. Come ottieni esattamente 4 litri?',
   'Riempi la 5, versa nella 3, svuota la 3, travasa i 2, riempi di nuovo la 5, colma la 3 — ne restano 4',
   '["Riempi la brocca da 3 e aggiungine un terzo alla 5 piena", "Riempi entrambe e butta via metà del totale", "Riempi la 5 e versa più o meno un quinto"]',
   'Riempi la 5 e versa nella 3: nella grande restano esattamente 2. Svuota la 3 e travasa i 2 — nella piccola c''è posto per esattamente 1. Riempi di nuovo la 5 e colma la 3: esattamente 1 litro lascia la brocca grande, e ne restano esattamente 4. Ogni passo è esatto perché riempie o svuota del tutto una brocca; le opzioni sbagliate chiedono di stimare una frazione a occhio, e l''enigma non offre alcun modo di farlo.',
   3),

  ('A farmer has 17 sheep%',
   'Un contadino ha 17 pecore. Scappano tutte tranne 9. Quante ne restano?',
   '9',
   '["8", "17", "Nessuna"]',
   '«Tutte tranne 9» significa che le 9 sono quelle rimaste. Il riflesso è sottrarre (17 − 9 = 8) perché la frase ha il ritmo di una sottrazione, ma il 9 non ha mai contato quelle in fuga.',
   1),

  ('If 5 machines%',
   'Se 5 macchine impiegano 5 minuti per fare 5 pezzi, quanto impiegano 100 macchine per fare 100 pezzi?',
   '5 minuti',
   '["100 minuti", "20 minuti", "1 minuto"]',
   'Dall''enunciato, una macchina fa un pezzo in 5 minuti. Cento macchine, ognuna col proprio pezzo, impiegano sempre 5 minuti — il lavoro è perfettamente parallelo. «100 minuti» nasce dal ricalcare i numeri (5-5-5 → 100-100-100); le altre dal dividere ciò che non va diviso.',
   2),

  ('A patch of lily pads%',
   'Una distesa di ninfee raddoppia ogni giorno. Copre l''intero lago il giorno 48. In che giorno ne copriva la metà?',
   'Il giorno 47',
   '["Il giorno 24", "Il giorno 46", "Il giorno 12"]',
   'Raddoppiare ogni giorno significa che il giorno prima della copertura totale era esattamente metà: il 47. «Il 24» è la risposta della crescita lineare — dimezzare il tempo invece di annullare un raddoppio. L''esponenziale passa quasi tutto il tempo a sembrare piccolo, ed è proprio per questo che la risposta giusta sembra strana.',
   2),

  ('A bat and a ball%',
   'Una mazza e una palla costano insieme 110 monete. La mazza costa 100 monete più della palla. Quanto costa la palla?',
   '5 monete',
   '["10 monete", "15 monete", "1 moneta"]',
   'Se la palla costa b, la mazza costa b + 100, e insieme: 2b + 100 = 110, quindi b = 5. Verifica: 5 + 105 = 110 e la differenza è esattamente 100. Il «10» immediato torna col totale ma porta la differenza a 90 — legge «100 in più» come «la mazza costa 100».',
   2),

  ('A man looks at a portrait%',
   'Un uomo guarda un ritratto e dice: «Non ho né fratelli né sorelle, ma il padre di quest''uomo è il figlio di mio padre». Chi c''è nel ritratto?',
   'Suo figlio',
   '["Lui stesso", "Suo padre", "Suo fratello"]',
   'Risolvi dall''interno: «il figlio di mio padre», per un uomo senza fratelli, è lui stesso. Sostituisci: «il padre di quest''uomo sono IO» — il ritratto mostra dunque suo figlio. «Lui stesso» è ciò che la frase sembra dire prima della sostituzione; «suo fratello» è escluso dalla prima clausola.',
   3),

  ('You have 8 identical-looking balls%',
   'Hai 8 palline dall''aspetto identico; una è un po'' più pesante. Con una bilancia a due piatti, quante pesate servono, nel caso peggiore, per individuarla con certezza?',
   '2',
   '["3", "4", "7"]',
   'Pesa 3 contro 3. Se sono in equilibrio, la pesante è tra le 2 messe da parte — un''altra pesata decide. Se un piatto scende, è tra quelle 3: pesa 1 contro 1, o una scende o è la terza. Ogni pesata ha tre esiti (sinistra, destra, equilibrio), quindi divide i candidati per tre, non per due — il «3» viene dal dimezzare come in una domanda sì/no.',
   4),

  ('At six o''clock a clock%',
   'Alle sei in punto un orologio impiega 5 secondi a battere 6 rintocchi. Quanto impiega a batterne 12 a mezzanotte?',
   '11 secondi',
   '["10 secondi", "12 secondi", "6 secondi"]',
   'A costare tempo non sono i rintocchi ma gli intervalli fra loro. Sei rintocchi hanno 5 intervalli, quindi ogni intervallo dura 1 secondo. Dodici rintocchi hanno 11 intervalli: 11 secondi. «10» raddoppia il tempo iniziale — assumendo in silenzio che 6 rintocchi facciano 6 intervalli.',
   3),

  ('Two fathers and two sons%',
   'Due padri e due figli si dividono tre mele, e ognuno ne mangia esattamente una intera. Com''è possibile?',
   'Sono nonno, padre e figlio — tre persone',
   '["Una mela è stata tagliata e condivisa", "Uno di loro ne ha mangiate due", "Non è possibile"]',
   '«Due padri e due figli» non richiede quattro persone. Nonno, figlio e nipote contengono due padri (nonno, padre) e due figli (padre, figlio) in tre persone — quello in mezzo conta due volte. Tre persone, tre mele, una a testa. Ogni opzione sbagliata conserva in silenzio l''ipotesi delle quattro persone.',
   2),

  ('How many times can you subtract%',
   'Quante volte puoi sottrarre 10 da 100?',
   'Una volta',
   '["Dieci volte", "Nove volte", "Quante ne vuoi"]',
   'Dopo la prima sottrazione non stai più sottraendo da 100 ma da 90. La domanda riguarda proprio il sottrarre da 100, e può accadere una volta sola. «Dieci volte» risponde a un''altra domanda: quanti passi prima che non resti nulla.',
   2),

  ('A fair coin%',
   'Una moneta equa è uscita testa 9 volte di fila. Qual è la probabilità che il prossimo lancio sia ancora testa?',
   'Esattamente 1 su 2',
   '["Meno di 1 su 2 — croce è in ritardo", "Più di 1 su 2 — la moneta è in serie", "1 su 1024"]',
   'La moneta non ha memoria: ogni lancio di una moneta equa vale 1/2, qualunque sia la storia. «Croce è in ritardo» è la fallacia del giocatore; «è in serie» è la stessa fallacia al contrario. 1/1024 è la probabilità di dieci teste di fila calcolata PRIMA di qualsiasi lancio — non quella di un''altra testa quando nove sono già in cassa.',
   2),

  ('Five people meet%',
   'Cinque persone si incontrano e ognuna stringe la mano a ciascuna delle altre esattamente una volta. Quante strette di mano?',
   '10',
   '["25", "20", "5"]',
   'Ognuna delle 5 persone stringe 4 mani: 5 × 4 = 20 — ma così ogni stretta è contata due volte, una per estremità. Quindi 20 / 2 = 10. «25» è 5 × 5 (ognuno che stringe la propria mano); «20» dimentica il doppio conteggio; «5» le immagina in fila.',
   2),

  ('What is the minimum number of ducks%',
   'Qual è il numero minimo di anatre perché ci sia un''anatra davanti a due anatre, un''anatra dietro a due anatre e un''anatra fra due anatre?',
   '3',
   '["5", "4", "6"]',
   'Tre anatre in fila indiana svolgono i tre ruoli insieme: la prima sta davanti alle altre due, l''ultima dietro alle altre due, quella in mezzo fra due. Le descrizioni suonano come tre scene separate con anatre proprie — è una sola scena raccontata in tre modi.',
   3),

  ('A brick weighs%',
   'Un mattone pesa un chilogrammo più mezzo mattone. Quanto pesa il mattone intero?',
   '2 chilogrammi',
   '["1,5 chilogrammi", "1 chilogrammo", "3 chilogrammi"]',
   'Chiama il mattone w: w = 1 + w/2, quindi w/2 = 1 e w = 2. Verifica: 1 kg più metà di 2 kg fa 2 kg. «1,5» nasce dal leggere «mezzo mattone» come mezzo chilo fisso invece che come metà dell''incognita che si sta cercando.',
   3),

  ('On the first of January%',
   'Il primo gennaio una ragazza dice: «L''altro ieri avevo 17 anni, e l''anno prossimo ne compirò 20». Quand''è il suo compleanno?',
   'Il 31 dicembre',
   '["Il 1° gennaio", "Il 2 gennaio", "È impossibile"]',
   'Parla il 1° gennaio. L''altro ieri — il 30 dicembre — aveva ancora 17 anni. Il 31 dicembre ne ha compiuti 18. QUEST''anno, il 31 dicembre, ne compie 19, e l''anno prossimo 20. Tutto torna solo se il compleanno è il 31 dicembre e le parole sono dette il 1° gennaio — l''unica data in cui «l''anno prossimo» mette due compleanni di distanza.',
   5),

  ('A rowing boat hangs a rope ladder%',
   'Una barca a remi tiene una scala di corda fuori bordo; i pioli distano 30 cm e a mezzogiorno dieci sono sott''acqua. La marea sale di 90 cm entro sera. Quanti pioli sono sott''acqua allora?',
   'Sempre dieci',
   '["Tredici", "Sette", "Dodici"]',
   'La barca galleggia — quando la marea sale, barca e scala salgono con lei, e la posizione della scala rispetto all''acqua non cambia mai. «Tredici» (10 + 90/30) è la risposta per una scala imbullonata al fondale — proprio l''immagine che la domanda invita in silenzio a disegnare.',
   2),

  ('You are given three boxes%',
   'Ti danno tre scatole etichettate MELE, ARANCE e MISTO — e ti dicono che tutte le etichette sono sbagliate. Estraendo un solo frutto da una sola scatola, come le rietichetti tutte e tre correttamente?',
   'Pesca dalla scatola MISTO; il suo frutto la nomina, e le altre due si scambiano',
   '["Pesca dalla scatola etichettata MELE", "Pesca un frutto da ciascuna di due scatole", "Non si può fare con una sola estrazione"]',
   'La scatola etichettata MISTO non può essere mista, quindi il frutto che ne peschi nomina il suo vero, unico contenuto — diciamo mele. La scatola ARANCE allora non può essere né arance (la propria etichetta) né mele (già assegnate): è la mista, e l''ultima contiene le arance. Cominciare da MELE insegna meno: un''arancia pescata lascia aperte due possibilità. La mossa forte è pescare dall''etichetta che mente più completamente.',
   4),

  ('A rich eccentric%',
   'Un ricco eccentrico mette in palio un premio per il cammello PIÙ LENTO: due cavalieri devono gareggiare, e vince quello il cui cammello taglia il traguardo per ultimo. I cavalieri temporeggiano per giorni, finché un passante dice due parole che li lanciano a tutta velocità. Quali?',
   'Scambiatevi i cammelli',
   '["Correte all''indietro", "Ricominciate", "Vincono entrambi"]',
   'Il premio va al padrone del cammello più lento. Sul proprio cammello, correre può solo danneggiarti. Ma sul cammello del rivale, ogni goccia di velocità che gli spremi fa arrivare primo il cammello SUO — e il tuo, cavalcato da lui, ultimo: il premio è tuo. Scambiare le cavalcature ribalta l''incentivo di entrambi dal temporeggiare allo sprint, senza cambiare quale cammello vince.',
   5),

  ('A windowless room%',
   'Una stanza senza finestre ha una porta e nessuna luce. Dieci persone vi nascondono una moneta ciascuna, una alla volta, senza vedere i nascondigli altrui. Poi ognuna deve trovare una moneta — una qualsiasi — e il gruppo riesce solo se tutti ne trovano una. Possono accordarsi prima su un piano. Quale piano garantisce il successo?',
   'Che tutti nascondano la moneta nello stesso punto concordato',
   '["Che tutti perlustrino la stanza nella stessa direzione", "Che ognuno memorizzi il proprio punto e recuperi la propria moneta", "Il successo non si può garantire"]',
   'La libertà dell''enigma è che nessuno deve trovare la PROPRIA moneta. Concordate prima un punto — diciamo appena dietro la porta — e le dieci monete finiscono in un solo mucchio che chiunque trova al tatto. «Recuperare la propria» servirebbe anche, ma il mucchio comune è il piano che non può fallire per nessuno, al buio, senza chiedere nulla alla memoria.',
   4)
) AS seed(en_prefix, q, a, w, x, d)
WHERE NOT EXISTS (
  SELECT 1 FROM public.king_questions WHERE source = 'seed-it-1'
);


INSERT INTO public.king_questions
  (language, translated_from, question_text, correct_answer, incorrect_answers, explanation, difficulty, source, is_active)
SELECT
  'pt',
  (SELECT e.id FROM public.king_questions e
    WHERE e.source = 'seed-en-1' AND e.question_text LIKE seed.en_prefix
    LIMIT 1),
  seed.q, seed.a, seed.w::jsonb, seed.x, seed.d, 'seed-pt-1', true
FROM (VALUES
  ('You have two ropes%',
   'Tens duas cordas. Cada uma demora exatamente uma hora a arder de ponta a ponta, mas arde de forma irregular — metade da corda não significa metade da hora. Usando apenas estas cordas e um isqueiro, como medes exatamente 45 minutos?',
   'Acende a corda A pelas duas pontas e a B por uma; quando A acabar, acende a outra ponta de B',
   '["Queima a corda A e depois metade da corda B", "Dobra a corda A ao meio e queima-a ao lado da B", "Acende ambas por uma ponta e para quando A estiver a três quartos"]',
   'Uma corda acesa pelas duas pontas consome-se em 30 minutos por mais irregular que arda — as duas chamas encontram-se sempre a meio do tempo total. Quando A se apaga passaram exatamente 30 minutos e à B (acesa por uma ponta) restam 30. Acender nesse momento a outra ponta reduz o resto a 15. 30 + 15 = 45. As opções erradas dependem todas de o comprimento significar algo — precisamente o que a queima irregular retira.',
   4),

  ('A snail climbs%',
   'Um caracol sobe um poste de 10 metros. Cada dia sobe 3 metros; cada noite escorrega 2. Em que dia chega ao topo?',
   'No dia 8',
   '["No dia 10", "No dia 7", "No dia 9"]',
   'A armadilha é tratar cada dia como +1 líquido. Isso só vale enquanto o caracol termina o dia abaixo do topo. Após 7 dias e noites completos está aos 7 metros. No dia 8 sobe 3 e toca nos 10 — chega ao topo antes de a noite o fazer escorregar. «Dia 10» é a resposta da aritmética do progresso líquido; as outras erram o ponto onde o padrão quebra.',
   2),

  ('Three switches%',
   'Três interruptores fora de uma sala fechada controlam três lâmpadas lá dentro. Podes acioná-los à vontade, mas só podes abrir a porta uma vez. Como descobres que interruptor controla cada lâmpada?',
   'Deixa um ligado um tempo, desliga-o, liga o segundo e entra: lâmpada quente, acesa e fria',
   '["Aciona cada interruptor depressa e escuta os filamentos", "Liga dois e deduz a partir das duas lâmpadas acesas", "É impossível numa única visita"]',
   'A luz não é o único sinal de uma lâmpada — uma lâmpada que esteve acesa também guarda calor. Deixa o interruptor 1 ligado uns minutos, desliga-o, liga o 2 e entra: a lâmpada acesa é a 2, a apagada mas quente é a 1, a apagada e fria é a 3. Dois interruptores ligados só nomeiam duas lâmpadas e deixam uma à sorte — a versão que parece chegar mas fica um bit curta.',
   3),

  ('In a running race%',
   'Numa corrida ultrapassas o corredor em segundo lugar. Em que posição ficas?',
   'Segundo',
   '["Primeiro", "Terceiro", "Depende de quantos corredores há"]',
   'Ultrapassar alguém coloca-te na posição que essa pessoa ocupava. Quem passaste ia em segundo, por isso agora és segundo e ele terceiro. «Primeiro» nasce da sensação de que passar alguém perto da frente te torna líder — mas nunca passaste o líder.',
   1),

  ('A father is 36%',
   'Um pai tem 36 anos e o filho 6. Daqui a quantos anos terá o pai exatamente o triplo da idade do filho?',
   '9 anos',
   '["6 anos", "12 anos", "15 anos"]',
   'Seja x o número de anos: 36 + x = 3 × (6 + x), ou seja 36 + x = 18 + 3x, dando x = 9. Verificação: 45 e 15. A DIFERENÇA de 30 anos nunca muda: o pai tem o triplo exatamente quando o filho atinge metade dessa diferença — 15. As opções erradas dividem o que não devem: 36/6 sugere 6, e duplicar ou dividir idades sugere 12 e 15.',
   3),

  ('You have a 5-liter jug%',
   'Tens um jarro de 5 litros, um de 3 litros e uma fonte. Como consegues exatamente 4 litros?',
   'Enche o de 5, verte para o de 3, esvazia o de 3, passa os 2, reenche o de 5 e completa o de 3 — ficam 4',
   '["Enche o jarro de 3 e junta um terço ao de 5 cheio", "Enche ambos e deita fora metade do total", "Enche o de 5 e verte mais ou menos um quinto"]',
   'Enche o de 5 e verte para o de 3: no grande ficam exatamente 2. Esvazia o de 3 e passa os 2 — no pequeno cabe exatamente mais 1. Reenche o de 5 e completa o de 3: sai exatamente 1 litro do jarro grande e ficam exatamente 4. Cada passo é exato porque enche ou esvazia um jarro por completo; as opções erradas exigem estimar uma fração a olho, e o enigma não dá maneira de o fazer.',
   3),

  ('A farmer has 17 sheep%',
   'Um agricultor tem 17 ovelhas. Fogem todas menos 9. Quantas ficam?',
   '9',
   '["8", "17", "Nenhuma"]',
   '«Todas menos 9» significa que as 9 são as que ficaram. O reflexo é subtrair (17 − 9 = 8) porque a frase tem o ritmo de uma subtração, mas o 9 nunca contou as que fugiram.',
   1),

  ('If 5 machines%',
   'Se 5 máquinas demoram 5 minutos a fazer 5 peças, quanto demoram 100 máquinas a fazer 100 peças?',
   '5 minutos',
   '["100 minutos", "20 minutos", "1 minuto"]',
   'Do enunciado, uma máquina faz uma peça em 5 minutos. Cem máquinas, cada uma com a sua peça, continuam a demorar 5 minutos — o trabalho é perfeitamente paralelo. «100 minutos» vem de decalcar o padrão dos números (5-5-5 → 100-100-100); as outras, de dividir o que não se deve dividir.',
   2),

  ('A patch of lily pads%',
   'Um manto de nenúfares duplica de tamanho todos os dias. Cobre o lago inteiro no dia 48. Em que dia cobria metade?',
   'No dia 47',
   '["No dia 24", "No dia 46", "No dia 12"]',
   'Duplicar todos os dias significa que na véspera da cobertura total era exatamente metade: dia 47. «Dia 24» é a resposta do crescimento linear — dividir o tempo ao meio em vez de desfazer uma duplicação. O exponencial passa quase todo o tempo a parecer pequeno, e é exatamente por isso que a resposta certa parece estranha.',
   2),

  ('A bat and a ball%',
   'Um taco e uma bola custam juntos 110 moedas. O taco custa mais 100 moedas do que a bola. Quanto custa a bola?',
   '5 moedas',
   '["10 moedas", "15 moedas", "1 moeda"]',
   'Se a bola custa b, o taco custa b + 100, e juntos: 2b + 100 = 110, logo b = 5. Verificação: 5 + 105 = 110 e a diferença é exatamente 100. O «10» imediato acerta no total mas deixa a diferença em 90 — lê «mais 100» como «o taco custa 100».',
   2),

  ('A man looks at a portrait%',
   'Um homem olha para um retrato e diz: «Irmãos e irmãs não tenho, mas o pai deste homem é o filho do meu pai.» Quem está no retrato?',
   'O filho dele',
   '["Ele próprio", "O pai dele", "O irmão dele"]',
   'Resolve de dentro para fora: «o filho do meu pai», para um homem sem irmãos, é ele próprio. Substitui: «o pai deste homem sou EU» — o retrato mostra portanto o filho dele. «Ele próprio» é o que a frase parece dizer antes da substituição; «o irmão» fica excluído logo na primeira parte.',
   3),

  ('You have 8 identical-looking balls%',
   'Tens 8 bolas de aspeto idêntico; uma é ligeiramente mais pesada. Com uma balança de pratos, quantas pesagens precisas, no pior caso, para a identificar com certeza?',
   '2',
   '["3", "4", "7"]',
   'Pesa 3 contra 3. Se equilibrarem, a pesada está entre as 2 postas de lado — mais uma pesagem decide. Se um prato descer, está entre essas 3: pesa 1 contra 1, ou uma desce ou é a terceira. Cada pesagem tem três resultados (esquerda, direita, equilíbrio), por isso corta os candidatos em três, não em dois — o «3» vem de dividir ao meio como numa pergunta de sim ou não.',
   4),

  ('At six o''clock a clock%',
   'Às seis horas um relógio demora 5 segundos a dar 6 badaladas. Quanto demora a dar 12 badaladas à meia-noite?',
   '11 segundos',
   '["10 segundos", "12 segundos", "6 segundos"]',
   'O que consome tempo não são as badaladas mas os intervalos entre elas. Seis badaladas têm 5 intervalos, cada um dura portanto 1 segundo. Doze badaladas têm 11 intervalos: 11 segundos. «10» duplica o tempo original — assumindo em silêncio que 6 badaladas têm 6 intervalos.',
   3),

  ('Two fathers and two sons%',
   'Dois pais e dois filhos repartem três maçãs, e cada pessoa come exatamente uma inteira. Como é possível?',
   'São avô, pai e filho — três pessoas',
   '["Uma maçã foi cortada e partilhada", "Um deles comeu duas", "Não é possível"]',
   '«Dois pais e dois filhos» não obriga a quatro pessoas. Um avô, o seu filho e o seu neto contêm dois pais (avô, pai) e dois filhos (pai, filho) em três pessoas — o do meio conta duas vezes. Três pessoas, três maçãs, uma cada. Todas as opções erradas mantêm em silêncio a suposição das quatro pessoas.',
   2),

  ('How many times can you subtract%',
   'Quantas vezes podes subtrair 10 de 100?',
   'Uma vez',
   '["Dez vezes", "Nove vezes", "As vezes que quiseres"]',
   'Depois da primeira subtração já não subtrais de 100 — subtrais de 90. A pergunta é especificamente sobre subtrair de 100, o que só pode acontecer uma vez. «Dez vezes» responde a outra pergunta: quantos passos até não sobrar nada.',
   2),

  ('A fair coin%',
   'Uma moeda equilibrada saiu cara 9 vezes seguidas. Qual é a probabilidade de o próximo lançamento ser também cara?',
   'Exatamente 1 em 2',
   '["Menos de 1 em 2 — a coroa está atrasada", "Mais de 1 em 2 — a moeda está numa série", "1 em 1024"]',
   'A moeda não tem memória: cada lançamento de uma moeda equilibrada vale 1/2, seja qual for o historial. «A coroa está atrasada» é a falácia do jogador; «está numa série» é a mesma falácia ao contrário. 1/1024 é a probabilidade de dez caras seguidas calculada ANTES de qualquer lançamento — não a de mais uma cara quando nove já estão garantidas.',
   2),

  ('Five people meet%',
   'Cinco pessoas encontram-se e cada uma aperta a mão de cada uma das outras exatamente uma vez. Quantos apertos de mão acontecem?',
   '10',
   '["25", "20", "5"]',
   'Cada uma das 5 pessoas aperta 4 mãos, o que conta 5 × 4 = 20 — mas assim cada aperto é contado duas vezes, uma por cada ponta. Logo 20 / 2 = 10. «25» é 5 × 5 (deixando cada um apertar a própria mão); «20» esquece a contagem dupla; «5» imagina-as em fila.',
   2),

  ('What is the minimum number of ducks%',
   'Qual é o número mínimo de patos para que haja um pato à frente de dois patos, um pato atrás de dois patos e um pato entre dois patos?',
   '3',
   '["5", "4", "6"]',
   'Três patos em fila indiana cumprem os três papéis ao mesmo tempo: o primeiro está à frente dos outros dois, o último atrás dos outros dois e o do meio entre dois. As descrições soam a três cenas separadas com patos próprios — é uma única cena descrita de três maneiras.',
   3),

  ('A brick weighs%',
   'Um tijolo pesa um quilograma mais meio tijolo. Quanto pesa o tijolo inteiro?',
   '2 quilogramas',
   '["1,5 quilogramas", "1 quilograma", "3 quilogramas"]',
   'Chama w ao tijolo: w = 1 + w/2, logo w/2 = 1 e w = 2. Verificação: 1 kg mais metade de 2 kg dá 2 kg. «1,5» vem de ler «meio tijolo» como meio quilo fixo em vez de metade da incógnita que se procura.',
   3),

  ('On the first of January%',
   'No dia um de janeiro uma rapariga diz: «Anteontem tinha 17 anos e para o ano faço 20.» Quando é o aniversário dela?',
   'A 31 de dezembro',
   '["A 1 de janeiro", "A 2 de janeiro", "É impossível"]',
   'Ela fala a 1 de janeiro. Anteontem — a 30 de dezembro — ainda tinha 17. A 31 de dezembro fez 18. ESTE ano, a 31 de dezembro, faz 19, e para o ano faz 20. Tudo bate certo apenas se o aniversário for a 31 de dezembro e as palavras forem ditas a 1 de janeiro — a única data em que «para o ano» põe dois aniversários de distância.',
   5),

  ('A rowing boat hangs a rope ladder%',
   'Um barco a remos tem uma escada de corda pendurada na borda; os degraus distam 30 cm e ao meio-dia dez estão debaixo de água. A maré sobe 90 cm até à noite. Quantos degraus ficam debaixo de água então?',
   'Continuam a ser dez',
   '["Treze", "Sete", "Doze"]',
   'O barco flutua — quando a maré sobe, o barco e a escada sobem com ela, e a posição da escada em relação à água nunca muda. «Treze» (10 + 90/30) é a resposta para uma escada aparafusada ao fundo do mar — exatamente a imagem que a pergunta convida, em silêncio, a desenhar.',
   2),

  ('You are given three boxes%',
   'Dão-te três caixas rotuladas MAÇÃS, LARANJAS e MISTA — e dizem-te que todos os rótulos estão errados. Tirando um único fruto de uma única caixa, como rotulas as três corretamente?',
   'Tira da caixa MISTA; o fruto nomeia-a, e as outras duas trocam',
   '["Tira da caixa rotulada MAÇÃS", "Tira um fruto de cada uma de duas caixas", "É impossível com uma única tiragem"]',
   'A caixa rotulada MISTA não pode ser mista, por isso o fruto que dela tirares nomeia o seu verdadeiro e único conteúdo — digamos maçãs. A caixa LARANJAS já não pode ser laranjas (o próprio rótulo) nem maçãs (já atribuídas): é a mista, e a última tem as laranjas. Começar pelas MAÇÃS ensina menos: uma laranja tirada deixa duas possibilidades em aberto. A jogada forte é tirar do rótulo que mente por completo.',
   4),

  ('A rich eccentric%',
   'Um excêntrico rico oferece um prémio ao camelo MAIS LENTO: dois cavaleiros têm de correr, e ganha aquele cujo camelo cruzar a meta em último. Os cavaleiros empatam durante dias, até que um transeunte diz duas palavras que os lançam a toda a velocidade. Quais foram?',
   'Troquem de camelos',
   '["Corram para trás", "Comecem de novo", "Ganham os dois"]',
   'O prémio vai para o dono do camelo mais lento. No teu próprio camelo, a velocidade só te prejudica. Mas no camelo do rival, cada gota de velocidade que lhe arrancares faz o camelo DELE chegar primeiro — e o teu, montado por ele, chegar último e dar-te o prémio. Trocar de montadas inverte o incentivo de ambos, do empate para o sprint, sem mudar nada sobre qual camelo ganha.',
   5),

  ('A windowless room%',
   'Uma sala sem janelas tem uma porta e nenhuma luz. Dez pessoas escondem lá dentro uma moeda cada, uma de cada vez, sem verem os esconderijos das outras. Depois cada uma tem de encontrar uma moeda — qualquer uma — e o grupo só vence se todas encontrarem. Podem combinar um plano antes. Que plano garante o sucesso?',
   'Todos esconderem a moeda no mesmo sítio combinado',
   '["Todos procurarem na sala na mesma direção", "Cada um memorizar o seu sítio e recuperar a própria moeda", "O sucesso não pode ser garantido"]',
   'A liberdade do enigma é que ninguém precisa de encontrar a SUA moeda. Combinem antes um sítio — digamos, logo atrás da porta — e as dez moedas acabam num único monte que qualquer um encontra pelo tato. «Recuperar a própria» também servia para encontrar, mas o monte comum é o plano que não pode falhar a ninguém, às escuras, sem exigir nada da memória.',
   4)
) AS seed(en_prefix, q, a, w, x, d)
WHERE NOT EXISTS (
  SELECT 1 FROM public.king_questions WHERE source = 'seed-pt-1'
);



-- Icons: the new rows inherit their English source's hand-picked slug
-- (20260921160000).
UPDATE public.king_questions k
   SET icon_slug = e.icon_slug
  FROM public.king_questions e
 WHERE k.translated_from = e.id
   AND k.icon_slug IS NULL
   AND e.icon_slug IS NOT NULL;

-- ── the English fallback in both draw paths ────────────────────────────────
-- Full redefinitions: only the extra final attempt changed.

CREATE OR REPLACE FUNCTION public.king_draw_question(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_match public.king_matches%ROWTYPE;
  v_question public.king_questions%ROWTYPE;
  v_options jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_match FROM public.king_matches
   WHERE id = p_match_id AND user_id = v_user FOR UPDATE;
  IF v_match.id IS NULL THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  IF v_match.status <> 'playing' THEN
    RAISE EXCEPTION 'Match is over';
  END IF;
  IF v_match.current_question_id IS NOT NULL THEN
    RETURN public.king_state(v_match);
  END IF;

  SELECT * INTO v_question FROM public.king_questions q
   WHERE q.is_active AND q.language = v_match.language
     AND q.id <> ALL (v_match.question_ids)
     AND NOT EXISTS (
       SELECT 1 FROM public.king_matches m
        WHERE m.user_id = v_user AND m.id <> v_match.id
          AND q.id = ANY (m.question_ids))
   ORDER BY random() LIMIT 1;

  IF v_question.id IS NULL THEN
    SELECT * INTO v_question FROM public.king_questions q
     WHERE q.is_active AND q.language = v_match.language
       AND q.id <> ALL (v_match.question_ids)
     ORDER BY random() LIMIT 1;
  END IF;

  -- A language with no pool (or an exhausted one) borrows the English pool
  -- rather than dead-ending the duel.
  IF v_question.id IS NULL AND v_match.language <> 'en' THEN
    SELECT * INTO v_question FROM public.king_questions q
     WHERE q.is_active AND q.language = 'en'
       AND q.id <> ALL (v_match.question_ids)
     ORDER BY random() LIMIT 1;
  END IF;

  IF v_question.id IS NULL THEN
    RAISE EXCEPTION 'KING_NO_QUESTIONS';
  END IF;

  SELECT jsonb_agg(value ORDER BY random()) INTO v_options
    FROM jsonb_array_elements(
      v_question.incorrect_answers || to_jsonb(ARRAY[v_question.correct_answer]));

  UPDATE public.king_matches
     SET current_question_id = v_question.id,
         drawn_at = now(),
         options_at = NULL,
         options = v_options
   WHERE id = v_match.id
  RETURNING * INTO v_match;

  RETURN public.king_state(v_match);
END;
$$;

REVOKE ALL ON FUNCTION public.king_draw_question(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.king_draw_question(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.king_team_draw_into(p_match public.king_team_matches)
RETURNS public.king_team_matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_question public.king_questions%ROWTYPE;
  v_match public.king_team_matches%ROWTYPE;
BEGIN
  SELECT * INTO v_question FROM public.king_questions q
   WHERE q.is_active AND q.language = p_match.language
     AND q.id <> ALL (p_match.question_ids)
     AND NOT EXISTS (
       SELECT 1 FROM public.king_matches km
        JOIN public.room_participants rp
          ON rp.user_id = km.user_id AND rp.room_id = p_match.room_id
       WHERE q.id = ANY (km.question_ids))
   ORDER BY random() LIMIT 1;

  IF v_question.id IS NULL THEN
    SELECT * INTO v_question FROM public.king_questions q
     WHERE q.is_active AND q.language = p_match.language
       AND q.id <> ALL (p_match.question_ids)
     ORDER BY random() LIMIT 1;
  END IF;

  IF v_question.id IS NULL AND p_match.language <> 'en' THEN
    SELECT * INTO v_question FROM public.king_questions q
     WHERE q.is_active AND q.language = 'en'
       AND q.id <> ALL (p_match.question_ids)
     ORDER BY random() LIMIT 1;
  END IF;

  IF v_question.id IS NULL THEN
    RAISE EXCEPTION 'KING_NO_QUESTIONS';
  END IF;

  UPDATE public.king_team_matches
     SET current_question_id = v_question.id,
         drawn_at = now(),
         options = NULL,
         options_at = NULL,
         suggestions = '{}'::jsonb,
         last_result = NULL,
         updated_at = now()
   WHERE id = p_match.id
  RETURNING * INTO v_match;
  RETURN v_match;
END;
$$;

REVOKE ALL ON FUNCTION public.king_team_draw_into(public.king_team_matches) FROM PUBLIC, anon, authenticated;
