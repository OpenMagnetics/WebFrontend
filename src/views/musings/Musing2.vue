<script setup>
import Header from '/src/components/BasicHeader.vue'
import Footer from '/src/components/Footer.vue'
</script>

<template>
    <Header />
    <main role="main" class="main">
        <div class="container" >
            <div class="row justify-content-center">
                <div class="col-md-9 ">
                    <h1 class="text-white">Alf’s Musings #2</h1>
                    <div class="user d-flex align-items-start justify-content-between bg-secondary p-4 rounded">
                        <div class="d-flex align-items-start">
                            <div class="d-block">
                                <span class="d-block text-white">by <a class="h6" >Alfonso Martínez</a></span>
                                <span class="d-block text-muted">15th Dec 2021</span>
                            </div>
                        </div>
                    </div>
                    <!--//blog section-->
                    <div class="blog-section text-white">
                        <h2 class="h2">A bit of context</h2>
                        <p>In the previous chapter of Alf’s Musings we talked about how Dowell, in his famous paper, applied his equation only for inductors, although he described the method for any number of windings, and how a large number of Engineers misuse Dowell’s method when they apply his method to the design of complex magnetics, like Flybacks.</p>
                        <p>In this number we will continue talking about the possible pitfalls when using Dowell’s method.</p>

                        <h2 class="h2">The second pitfall: the temporal partition</h2>
                        <p>In the previous pitfall we commented the three different sources of losses that exists on a turn, the current that flows through the wire, Direct and Alternating (which produces DC and Skin Effect losses), the Alternating Current through the rest of wires in the proximity (which, as you probably have guessed, dear reader, produces Proximity Effect losses) and the Magnetic Field Strength through the turns in the vicinity of a core air gap (in reality all Stray Magnetic Field Strength create losses in the turn, but it is only near the air gap that has relevant value).</p>
                        <p>This new pitfall is centered around a word that is commonly thrown, but sometimes without contemplating the consequences <a href="https://en.wikipedia.org/wiki/The_devil_is_in_the_details">in detail</a>: "conducting".</p>


                        <p>All of Dowell’s dissertation has the windings conducting all the time as a base, which is not difficult to understand, as that was the norm at the time, together with sinusoidal waveforms.</p>
                        <p>And why is this important? Well, Dowell based his whole <a href="https://en.wikipedia.org/wiki/Magnetomotive_force">magnetomotive force (mmf)</a> analysis for magnetics components in the ability to calculate the leakage resistance of a given layer parting from a point where the mmf is zero. This is easy to achieve in a simple inductor or a simple transformer, the ones without rectification, where the current in the secondary is the reflection of the current in the primary.</p>

                        <p>If, instead of having that simple magnetic, we are working with something more complex, with several secondaries where, at a given point in the period, some of them are conducting and some are not, things are not so simple. For example, in a Center-tapped Full bridge, where half the period the first secondary is conducting and second is open, and vice verse other half period; the magnetic field in the windings behaves as if we had two superimposed magnetics, with the layers of the non-conducting secondary acting as shielding, where eddy current are induced and losses are generated.</p>
                        <p>However, when most Engineers apply Dowell to such a transformer, they calculate the mmf diagram and the equations as if all the secondaries were conducting all the time and canceling the primary H field completely. They are assuming that the switching period is homogeneous and not paying attention to the details. Well, Dowell is in the details.</p>
                        <p>But we are Engineers, not Philosophers, so allow me to demonstrate with a practical application with another topology.</p>

                        <h3 class="h3">Exempli gratia</h3>
                        <p>Let’s imagine we have a magnetic component in a E core with two windings, each with 20 turns, divided in 2 layers each. Let’s forget the topology for now, and focus on the magnetic: it has 4 layers, each layer with 10 turns, ordered like so from the center column of the core: Isolation, primary layer, isolation, secondary layer, isolation, primary layer, isolation, secondary layer, and finally isolation. And these layers are filling the winding window in its totality.</p>
                        <p>If now we apply a current of 1A in the primary (let’s say triangular 50% duty cycle, conducting all the period) and assume perfect coupling, we also get 1A in the secondary winding.</p>

                        <p>This excitation, applying Dowell’s method, would produce the following mmf diagram:</p>

                        <img src="/images/musings/2/image2.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="Dowell MMF diagram inductor balanced" width="600" height="187">
                        <p>We can observe how the first primary layer rises the mmf to 10 A, and it subsequently lowered to 0 A by the 10 A circulating through the first layer of the secondary. The same is repeated for the other two layers. </p>
                        <p>This is a perfect example in which Dowell’s can be applied. If we follow the steps proposed by the author, the first would be to obtain the current density “at the tops of the conductors” in the diagram, 10 A in this case, and from it we can obtain the magnetic flux through the previous layer until we reach the point of 0 mmf. For simplicity’s sake, let’s assume we follow the full procedure and obtain a value of AC factor of X.</p>
                        <p>Let’s now change the excitation to a classical Flyback control (with the same duty cycle as before, 50%), where the primary is conducting the first half of the period (ton) and the secondary the second half (toff), in contrast with the previous example, where instead the primary and the secondary were conducting all the period.</p>
                        <img src="/images/musings/2/image4.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="Dowell MMF diagram inductor unbalanced" width="600" height="187">
                        <p class="text-center">Courtesy of <a href="https://www.coilcraft.com/en-us/edu/series/a-guide-to-flyback-transformers/">Coilcraft</a></p>


                        <p>Now we cannot draw a single mmf diagram, as we have two distinctive sections in each waveform, one for ton and another for toff</p>
                        <img src="/images/musings/2/image5.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="Dowell MMF diagram inductor unbalanced" width="600" height="187">
                        <p>During the first half period, the mmf grows due to the primary conducting, but it never decreases, because no current is flowing for now in the secondary. It behaves like an inductor (because a <a href="https://www.linkedin.com/pulse/flyback-transformer-coupled-inductors-slobodan-cuk/">Flyback is an inductor, not a transformer</a>, but that is another discussion) with copper shielding between the conduction layers.</p>
                        <p>The opposite happens during the second half of the period, where the mmf is continuously decreasing as the only current circulating is on the secondary.</p>
                        <p>I know all this can look like boring details, but it really shows my point on why you should not use Dowell’s method for a Flyback, so bear with me, dear reader.</p>

                        <p>If we now apply Dowell’s method to any of these diagrams, as we did for the previous one, we would have exactly the same magnetic, but we would be starting with a current density “at the tops of the conductors” of 20A, instead of the previous 10A. If we followed the full process we would end up with an AC factor of 2X, double the previous case.</p>

                        <p>Lo and behold! Same magnetic, same core, same number of layers, same number of turns in each layer, and the same peak current of 10A: in the first case we have half the AC resistance as in the second case. And which is the same, we have a difference of two times in the winding losses depending on which case we apply.</p>

                        <p>This is the simplest example I can think of where you should NOT use Dowell’s method to estimate the winding losses, but it is applicable to any topology where not all windings are conducting at the same time. And the simplest explanation is found in Dowell’s paper, at the beginning, where he explains the two principle on which his reasoning is based, and the second is:</p>
                        <img src="/images/musings/2/image1.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="leakage flux explanation from Dowell" width="497" height="77">
                        <p>I know this is difficult to accept to people who has been using Dowell for years or decades (and applying conservative requirements to prevent the magnetic from burning because Dowell predicted 50% less losses), I know you are rolling your eyes and thinking that this is too complex to be true (and this is nothing, wait until we analyze Albach’s algorithm). So let me go over another ridiculous consequence of applying Dowell to a Flyback.</p>

                        <p>The diagram proposed by the author is roughly a one dimensional representation of the magnetic field strength along the winding, from the side of the internal radius of the winding to the external radius. Since the proximity losses are proportional to the external magnetic field in the layer, this would imply that the losses are proportional to the area covered by the diagram.</p>
                        <p>Applying Dowell for the first excitation, where both are conducting, is a good rough representation of the H field and therefore the proximity losses.</p>
                        <p>However, in the second case, with the Flyback excitation, we find ourselves with a funny case during the Toff (pink line): The diagram show that we have no mmf, and therefore no proximity losses on the left-most layer of the primary, while having a lot of losses on the right-most layer of the primary.</p>
                        <p>But there is no reason why we couldn’t draw our mmf diagram from right to left. In this case both layers would have losses, but the left-most layer of the primary would have many more than the right-most layer. </p>

                        <p>We have 0 proximity losses, or the maximum, in the same layer, depending how we apply Dowell’s method. Which one is correct? The first one? The second more lossy one? The average of both? The answer is neither. You simply cannot apply Dowell to a Flyback and not lose all your <a href="https://www.d20srd.org/srd/variant/campaigns/sanity.htm">sanity points</a>.</p>
                        <p>What? You still want to use Dowell to design your Flyback? Let me quickly summarize all the points:</p>

                        <p><b>TL;DR</b>, from the explained theory and examples we can extract some direct implications:</p>

                        <ul>
                            <li>The AC resistance, as defined by Dowell, is a continuous vector that varies through the period, though we engineers find it more comfortable to average it, as Dowell did. But</li>
                            <li>In the case of topologies in which one or more windings are not conducting the whole period, the AC resistance is completely different, and it depends on which windings are conducting at a given point of the period.</li>
                            <li>We can apply Dowell to multi secondaries magnetics, as long as all the windings are conducting all the period and the mmf has no local minima.</li>
                            <li>We cannot (ok, you can, but you should NOT) use Dowell's method for the following topologies: Flyback, Forward, Push-Pull, Weinberg, some Half and Full bridges, and probably some more I am forgetting. <a href="https://www.youtube.com/watch?v=ccenFp_3kq8">No can do</a> </li>
                        </ul>
                        <p>Applying these implications to a common case like Flyback, they mean:</p>
                        <ul>
                            <li>The AC resistance of the inductor depends not only on the voltages, switching frequency and power, but also on the duty cycle (which affects the harmonics, we will talk about his in detail in the next Musing)</li>
                            <li>The current of secondary is affecting the AC losses of the primary, and vice versa.</li>
                            <li>During the conducting time of the primary (ton), the effects that produce losses in each windings (excluding fringing flux) are:</li>
                            <ul>
                                <li>Primary: DC, skin, and proximity losses, due to the current through itself.</li>
                                <li>Secondary: Proximity losses due to the current through the primary winding</li>
                            </ul>
                            <li>During the conducting time of the secondary (toff), the losses are:</li>
                            <ul>
                                <li>Primary: Proximity losses due to the current through the secondary winding.</li>
                                <li>Secondary: DC, skin, and proximity losses due to the current through itself.</li>
                            </ul>
                        </ul>
                        <p>And this is for now, dear reader, and kudos to you if you managed to reach this point, this Alf’s Musing has been really really dense. I promise you the next ones will be lighter.</p>
                        <img src="/images/musings/1/image1.webp" class="img-fluid bounce-little my-3" alt="To be continued" width="384" height="216">
                    </div>
                </div>
            </div>
        </div>
    </main>
    <Footer />
</template>

