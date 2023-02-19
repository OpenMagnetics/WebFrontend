<script setup>
import Header from '/src/components/BasicHeader.vue'
import Footer from '/src/components/Footer.vue'
</script>

<template>
    <Header />
    <main role="main">
        <div class="container" >
            <div class="row justify-content-center">
                <div class="col-md-9 ">
                    <h1 class="text-white">Alf’s Musings #1</h1>
                    <div class="user d-flex align-items-start justify-content-between bg-secondary p-4 rounded">
                        <div class="d-flex align-items-start">
                            <div class="d-block">
                                <span class="d-block text-white">by <a class="h6" >Alfonso Martínez</a></span>
                                <span class="d-block text-muted">2nd Feb 2023</span>
                            </div>
                        </div>
                    </div>
                    <!--//blog section-->
                    <div class="blog-section text-white">
                        <h2 class="h2 mt-3">A bit out of context</h2>
                        <p>This is a revisited version of the first Alf’s Musings, as the original is no longer available. I have properly rewritten everything and added new content, so even if you read the original version, you can still enjoy this one.</p>
                        <h2 class="h2 mt-3">A bit of context</h2>
                        <p>Welcome to 1966. Vietnam is burning and the Hippies movement is crossing the world. My idolized Doors are recording their <a target="_blank" href="https://www.youtube.com/watch?v=w6LiHXsBmmA">first (and for me, best) album</a>, while Cash and Sinatra are getting any penny not taken by the Beach Boys. Walt Disney <s><a target="_blank" href="https://www.bbc.com/culture/article/20190426-was-walt-disney-frozen-after-death">is being cryogenized</a></s> has died. Electric devices are entering American kitchens, and a weird TV show called Star Trek is being broadcast. Europe looks nervously at the 23rd Congress of the Communist Party of the Soviet Union, while in Berlin the people are allowed to cross the Wall to enjoy Christmas with their loved ones.</p>
                        <p>But something else happened that year in Denmark, something that would affect us Engineers during many decades to come. P.L. Dowell, while working on the Telephon Fabrik Automatic in Copenhagen, published the paper he had been researching during his time in Mullard Research Laboratories: <a target="_blank" href="https://sci-hub.wf/10.1049/piee.1966.0236">"Effects of eddy currents in transformer windings"</a>. And, still nowadays, this paper and his equation has more followers than the Doors.</p>
                        <p>Because of that, the first <s>and only</s> chapter of Alf’s Musings is dedicated to P.L. Dowell. Specifically, I will analyze his paper, his reasoning, his merits and, spoiler alert, I will explain why it should not be used to design a transformer. Concretely to why you shouldn’t use Dowell’s method to design your transformers.</p>
                        <p>Starting at the beginning, let’s talk a bit about the author. Not much is known about Dowell, except <s>his being a time traveler paper</s>. If we focus on the introduction, the author talks about the previous work that was done developing equations for slot-wound-armature conductors, which inspires him to apply the same principles to an inductor and its winding. This inspiration set the first stone of all the work done in the following decades, from Ferreira to Albach model. Since 1966, the paper has been cited 1580 times (according to <a target="_blank" href="https://scholar.google.com/scholar?cites=6619550130293661580&as_sdt=5,31&sciodt=0,31&hl=en">Google Scholar</a>) as of February 2023, has appeared in all books about magnetics design, has been implemented in all existing design software, and has been used for a large part of all the magnetics designed in the last decades. The day an AI is able to design a magnetic component, it will have Dowell in its training.</p>

                        <p>Actually, in my modest opinion, one of the main reasons for this success is that it is really easy to implement in software, including Excel spreadsheets, and only the most basic knowledge of programming is needed. </p>
                        <p>This easy-to-implement equation uses the switching frequency, the number of layers and the width of the conductor, and it provides the AC factor for a given magnetic. This AC factor represents how much the resistance of a given winding is increased, at the given switching frequency, with respect to the DC resistance.</p>
                        <img src="/images/musings/1/image3.webp" class="img-fluid bounce-little my-3" alt="Dowell curves" width="394" height="333">
                        <p>It was a really innovative solution at a time where there were no spreadsheets, no calculators, no computers, and all calculations were done with trigonometric tables. And going further, in order to facilitate its use, the author provided a series of curves (the famous Dowell’s Curves) where, for different numbers of layers, he plotted the AC factor versus the coefficient of the conducting diameter of the wire divided the skin effect depth.</p>
                        <p>This allowed any Engineer of the time to roughly know the amount of losses their inductor was going to have, just by knowing the number of layers, the switching frequency and the wire thickness, which was really good at the time. In fact, it was so good, that many Engineer still uses the Curves and not the equation, which is <s>anachronic</s> a bad idea, as they are just adding the <a target="_blank" href="https://www.proquest.com/openview/7e3ada66539c829c90ebf8bf48ed1c63/1?pq-origsite=gscholar&cbl=1820938">thick point</a> error to the inherent error in Dowell’s model (and in any model), and in exchange they are just getting more dioptres.</p>

                        <img src="/images/musings/1/image4.webp" class="img-fluid bounce-little my-3" alt="Large dot method" width="169" height="321">
                        <p>I want to clarify, before continuing, that in no way I intend to criticize or minimize the work done by Dowell, but the following points have the intention of highlighting some misuses that many Engineers make of the author’s work, explaining the reasons why.</p>
                        <p>My explanation is divided into several misuses, or pitfalls, so let’s get on with the first one!</p>
                        <h2 class="h2">The first pitfall: singular, dual, plural</h2>
                        <p>Once of the things that fascinates me about some languages, including Old English, is that, additionally to singular and plural, they have dual (and if you, dear English reader, are looking weirdly at me, remember that you have both, either, and neither; additionally to all, any, and none). The same happens with models for calculating winding parameters in magnetic components.</p>
                        <p>We have models that work for only simple inductors (one winding), simple transformers (two windings) and other combinations, like Flyback inductors, or Multi Secondary Transformers (more than two windings). And this distinction and limitation is fine, as long as we respect it. It would be an error to use a model for the capacitance of an inductor to model a transformer.</p>
                        <p>I might look like I am digressing, but let me go back to Dowell, and all will make sense.</p>

                        <p>We talked about the variables in Dowell’s method above, but I didn’t mention the steps of the methods. let’s do it now: </p>
                        <ol>
                            <li>Calculate the DC resistance of your winding. <a target="_blank" href="https://en.wikipedia.org/wiki/Electrical_resistance_and_conductance">You should know how to do this.</a></li>
                            <li>Calculate the skin depth (<b>𝛼</b>) of your main harmonic, how? <a target="_blank" href="https://e-magnetica.pl/skin_depth"> here you have.</a></li>
                            <li>Get the conducting height (<b>h</b>) of your conductor, not the total width (without insulation).</li>
                            <li>Count how many layers (<b>m</b>) do you have (or expect to have).</li>
                            <li>Do some trigonometrical calculation and get their real part:</li>
                            <img src="/images/musings/1/image5.webp" class="img-fluid bounce-little my-3" alt="Part of Dowell equation" width="169" height="321">
                            <li>Calculate the AC factor with Dowell’s formula, or get it from his Curves</li>
                            <img src="/images/musings/1/image6.webp" class="img-fluid bounce-little my-3" alt="Part of Dowell equation" width="169" height="321">
                            <li>Multiply your AC factor (FR) by your DC resistance in order to get your AC resistance, all done!</li>
                        </ol>

                        <p>That AC resistance would be the equivalent resistance that your winding will have at the frequency of your main harmonic, and in order to get the losses, you just have to multiply it with the square of the current RMS. Simple, right?</p>

                        <p>And is this simplicity what provokes the first pitfall. Since we can apply Dowell to one winding, why couldn’t we do the same for a multi winding magnetic, calculating the AC factor of each winding and multiplying it by its DC resistance? At the end, each winding has its own number of layers and wire thickness, hasn’t it? And we could multiply this by the current in each winding and voila! We have our winding losses! Who said that magnetics were difficult?</p>

                        <img src="/images/musings/1/image2.webp" class="img-fluid bounce-little my-3" alt="Dilbert power supply" width="600" height="187">
                        <p>With this kind of things, the line that separates facts from opinion is thin, so I will make this especially clear: I believe that the AC resistance is virtual parameters created by us, Engineers, as we try to have a model for the AC losses that is somehow similar to the one we have for the DC losses.</p>
                        <p>I am not saying that it can not be useful, just that it is not something that physically exists: there is no AC resistivity.</p>
                        <p>And I mean it can be useful, and my opinion is that for the AC resistance to be useful, it must be in square matrix form, where the dimension is the number of windings, which would make it a scalar value only for simple inductors, as it is treated by Dowell.</p>
                        <p>But beware, oh dear reader, as it can also be harmful, especially when it is expressed as a value per winding, as if it were an ohmic resistance.</p>
                        <p>The reason for my claims can be intuitive, but not easy to explain. Allow me to try:</p>

                        <p>There are three sources for the losses that appear in an individual turn inside a magnetic component:</p>
                        <ol>
                            <li>The ohmic losses produced by the resistivity of the material, as the current density flows through it. These losses are per unit of length, and they increase as the length of the wire increases. As said, they depend heavily on the current density, which in turn depends on the conducting area of the wire. Wire area, wire length and resistivity? it must ring some bells, as this is commonly called DC resistance.</li>
                            <li>The skin losses, which are produced by the famous Skin Effect. When an AC current is circulating through our wire, it produces a magnetic field that opposes the current change during our switching period. In turn, this magnetic field produces an opposing current; and because our wire is round and this happens in all 360º of the cross-sectional area, these induced currents cancel each other in the center of the wire and reinforce themselves on the external ring. The result is a higher current density on the external ring, while the center of the wire is barely conducting. This distribution is modeled with a parameter called <b>skin depth</b>, which is defined as the depth from the wire surface at which the current density has fallen to 1/e, and that it is inversely proportional to the switching frequency. In practice, this means that current that flows at that given harmonic has a smaller cross sectional area, and therefore its ohmic resistance will be higher. At the end of the day, the skin effect provokes additional losses, but, as in the previous case, they are ohmic losses, the only difference being that the current flowing at this frequency has a smaller area, and therefore a higher current density.</li>
                            <img src="/images/musings/1/image9.webp" class="img-fluid bounce-little my-3" alt="skin losses generation" width="300" height="187">
                            <img src="/images/musings/1/image8.webp" class="img-fluid bounce-little my-3" alt="skin effect" width="300" height="187">
                            <li>The proximity losses. If the previous losses were produced by the magnetic field of the current flowing through the wire on itself, the proximity losses are produced by magnetic fields from external sources. These magnetic fields induce currents inside the conducting material of our turn that, although their net contribution to the current flowing through the wire is null, they still create a distributed current density and generate ohmic losses. And what is producing these external magnetic fields that are wreaking havoc in our turns? Well, mainly the other turns in the proximity, which gives the affect its name, but any source of magnetic field would cause the same effect; the most famous being the fringing flux field, which is the magnetic field that flows in the vicinity of the core gaps. But this is a topic for a longer issue!</li>
                            <img src="/images/musings/1/image7.webp" class="img-fluid bounce-little my-3" alt="skin losses generation" width="600" height="187">
                            <p><a target="_blank" href="https://e-magnetica.pl/user/stan_zurek">S. Zurek</a>, <a target="_blank" href="https://www.e-magnetica.pl/">Encyclopedia Magnetica</a>, <a target="_blank" href="http://creativecommons.org/licenses/by/4.0/">CC-BY-4.0</a></p>
                        </ol>
                        <p>I know, I know, all this can look quite theoretical and we are all Engineers and like applied things. Let me extract what this means for our AC resistance and Dowell’s model.</p>
                        <p>If we ignore for now fringing flux and temperature dependency (let’s assume some nice constant 20º C), the losses in a turn are produced from two different excitations: The total current flowing through it (DC and AC), and the AC current that flows through the rest of the turns. And this imply the following applied points:</p>

                        <ol>
                            <li>The AC resistance is not a constant value, fixed by the construction of our magnetic component, as happens with the DC resistance.</li>
                            <li>The current flowing through a given turn is not the only one affecting the AC losses of that turn, which follows</li>
                            <li>The AC losses of a given turn depends on the current flowing through each winding, and not just on its RMS, but on the amplitude of each harmonic, their frequency and the phase.</li>
                            <li>When we add more parallels to our winding, in order to lower the current density, and therefore our DC resistance, we are decreasing the strength of the proximity magnetic fields, but we are multiplying the number of sources, which can increment our total losses.</li>
                            <li>I was always a fan of the research of <a target="_blank" href="https://ieeexplore.ieee.org/document/880550">Profesor Alfred Albach</a>, so this one is my favorite implication: we have been talking about conductors all the time, so what happens with Litz wire, which is made of hundreds or thousands of small strands? Yes, it is what you're thinking, dear reader, each one of these wires is a source of proximity effect on the rest of strands. This is a special case of proximity effect, as the current that produces it is the one of its own winding, and it’s called Internal Proximity Effect.</li>
                        </ol>
                        <p>And these effects not only have implications at the magnetic component level, they also affect us at converter level. If we focus on a common Phase-Shifted Full Bridge case, the implications are:</p>
                        <ul>
                            <li>The current that is flowing through each secondary affects the losses in the primary and on the rest of secondaries, and vice versa.</li>
                            <li>We are not focusing on the energy side of these losses, but everybody can intuitively understand that the energy dissipated in our AC losses is not <a target="_blank" href="https://doom.fandom.com/wiki/Argent_Energy">just extracted from Hell</a>. It is requested from the source, which increases the current circulating through the primary, which in turn produces more AC losses…</li>
                        </ul>

                        <p>I am close to finishing this chapter, and it was supposed to be about Dowell.</p>
                        <p>So, was he wrong? Not really. In the first part of his work he discusses how to calculate the leakage inductance and resistance for any number of windings or layers, and they are correct. The confusing part comes in the second half of the paper, when he derives his famous formula and curves assuming a stable continuously increasing <a target="_blank" href="https://en.wikipedia.org/wiki/Magnetomotive_force">MMF</a> that starts in 0, which is the case for an inductor (what he uses as an example) or a non-interleaved transformer. For cases where this is not true (like any Flyback or interleaved transformer) using this method is wrong.</p>
                        <p>I would like to finish with a proposal for all Power Engineers that read this article. Let’s accept the nature of the AC resistance, let’s stop calculating per winding, as if it were a DC resistance. Instead, why not work with a global value of the AC resistance? The AC resistance of your inductor/transformer. But, what if I want to work with windings and calculate the losses separately?, or even more hardcore, with layers or turns? Well, then we have to work with a NxN matrix. <a target="_blank" href="https://knowyourmeme.com/memes/deal-with-it">Deal with it</a>.</p>
                        <p>And this is all for now, the pitfall will continue in the chapter!</p>
                        <img src="/images/musings/1/image1.webp" class="img-fluid bounce-little my-3" alt="To be continued" width="384" height="216">
                    </div>
                </div>
            </div>
        </div>
    </main>
    <Footer />
</template>

