<script setup>
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'
</script>

<template>
    <Header />
    <main role="main">
        <div class="container" >
            <div class="row justify-content-center">
                <div class="col-md-9 ">
                    <h1 class="text-white">Alf’s Musings #2</h1>
                    <div class="user d-flex align-items-start justify-content-between bg-secondary p-4 rounded">
                        <div class="d-flex align-items-start">
                            <img src="./img/kajal.png" class="img-fluid rounded-circle" alt="">
                            <div class="d-block">
                                <span class="d-block text-white">by <a class="h6" >Alfonso Martínez</a></span>
                                <span class="d-block text-muted">15th Dec 2021</span>
                            </div>
                        </div>
                    </div>
                    <!--//blog section-->
                    <div class="blog-section text-white">
                        <h1 class="h2">Alf’s errata</h1>
                        <p>In the previous part of this Musing, especially in the last paragraph, it was stated that the first part of Dowell’s paper was focused on finding the leakage inductance and resistance of a magnetic with any number of windings. That was <a href="https://culturacientifica.com/app/uploads/2017/05/Errare-humanum-est.gif">erred</a>. Dowell’s explanation is done for any number and combination of layers, which can have equal or different currents, belonging to the same or different windings.</p>
                        <p>The second part though, where he developed his famous equations is, nevertheless, focussed on windings, or more concretely in all the layers of an individual and concrete winding, as does its equations; which maintains the affirmation of their being incorrect.</p>
                        <p>And this is totally my opinion (well, the rest too), but the reason why the whole confusion started is because in the paper itself, in the conclusions, he comments how he has validated his equations with one-layer windings.</p>

                        <h1 class="h2">The second pitfall: the temporal partition</h1>
                        <p>In the previous number we were talking about how the losses in a turn come from two main excitations: the current circulating through it, DC and AC; and the AC current circulating in other turns. We extracted a few conclusions from this, but I promised there were a few more, and the trick was in the adjective “conducting” (7th paragraph, second to last sentence in my previous number, go and check it, <a href="https://www.goodreads.com/book/show/50690241-true-believer">true believer!</a>).</p>
                        <p>Dowell’s dissertation is all based on windings conducting the whole period, as was common at the time. And with sinusoidal waveforms, but I am reserving this point for the last section.</p>
                        <p>Why is it important that they are conducting the whole time for Dowell’s <a href="https://en.wikipedia.org/wiki/Magnetomotive_force">magnetomotive force (mmf)</a> analysis, especially in a transformer/coupled inductors? Because it is based on being able to calculate the resistance leakage for any layer parting from a point of zero mmf. In a magnetic with windings not conducting at some point what we really have is two or more magnetics superposed in time, with layers in between of conducting material, where only induced currents are circulating and generating losses.</p>
                        <p>The reason for my rant about applying Dowell’s method on these kinds of magnetics is not so much a philosophical reason as much as an engineering one. When we ignore the conducting state of each winding and apply Dowell’s equations, the values extracted from the mmf graphs are calculated assuming the H field of the primary is being canceled by the secondary. The reality is that it is not.</p>

                        <h1 class="h2">Exempli gratia</h1>
                        <p>Let me put an example: We have a magnetic with four layers: primary, secondary, primary, secondary (PSPS), each with 10 turns.</p>
                        <p>If we connect it to a circuit that will feed the primary 1A, we get the following mmf diagram:</p>
                        <img src="/src/assets/images/musings/2/image2.png" class="img-fluid bounce-little my-3" alt="">
                        <p>This is a classical example, where Dowell’s method is totally applicable. The primary increases the mmf in its layers, and it is afterward counteracted by the current flowing in the opposite direction in the secondary.</p>
                        <p>But, if now we grab this magnetic and connect it to a Flyback converter, where the primary is conducting half the period (let’s assume 0.5 duty cycle, for clarity) and the secondary is conducting the other half. The mmf diagram we get is the following:</p>
                        <img src="/src/assets/images/musings/2/image3.png" class="img-fluid bounce-little my-3" alt="">
                        <p>We can observe how the mmf in the first half grows from the first layer and is not counteracted by any opposing current. And equally happens in the second half of the period with the secondary.</p>
                        <p>I know all this can be a bit dry, but stay with me a bit longer: Supposing we apply Dowell’s method for calculating the AC resistance to this magnetic as proposed by him, not even directly his equations, but the method that is summarized by the equations; the first step would be to calculate the current density “at the tops of conductors” in the diagram, and from it derive the magnetic flux through the previous layers.</p>
                        <p>But lo and behold! In the first case, we would be parting from half the mmf than in the second case, and this would derive a smaller AC factor for the first case than for the second case. Same magnetic, with the same number of turns and interleaved layers arrangement, and with the same peak current circulating through it, will have a different AC resistance. (I know, I know, I already reached this implication in my third point before, but this is a more extreme case)</p>
                        <p>This example shows why you should NOT apply Dowell’s formulas to magnetics used in topologies with windings that are conducting part of the period. And hey, you can believe me, or you can believe Dowell, who literally starts his paper with two principles in which his following reasoning is based, and the second is:</p>
                        <img src="/src/assets/images/musings/2/image1.png" class="img-fluid bounce-little my-3" alt="">
                        <p>You still want to use Dowell’s for your Flyback? Really? Let me point out one more ridiculous consequence of applying Dowell’s to a Flyback.</p>
                        <p>The mmf diagram is a rough one dimensional representation of the H field distribution in the winding. If we translate this to practical engineering terms, it means that the bigger the area of the diagram over (or under ) the x axis at a winding layer, the proportionally bigger the losses due to induced currents (proximity effect) in that layer.</p>
                        <p>So… does that mean that in the second half of the period there are no losses due to proximity effect in the first (left most) layer of the primary, where the mmf is zero? Wait wait, that is just because we decided to draw the diagram from the left, if we do it from the right, that layer get’s the maximum mmf. Which one is correct? The answer is neither, you cannot apply Dowell’s to a Flyback and keep all your <a href="https://www.d20srd.org/srd/variant/campaigns/sanity.htm">sanity points</a>.</p>
                        <p>And my conscience would let me finish the dense part without a little addendum, especially because I always hated those university professors who explained a simple case and then asked for a complex one in the final exam. Let me go for the final exam question: what happens with a weird, partial interleaving like a PPSPSS? Happens that we will have a local minimum in the third layer, and following Dowell’s own principle we should NOT use his equations. Poor Dowell, we are running out of applications.</p>

                        <p>TL;DR From the preceding text we can extract certain implications:</p>

                        <ul>
                            <li>The AC resistance is a continuous vector that varies through the period, though we engineers find it more comfortable to average it, as Dowell did. But</li>
                            <li>In the case of topologies in which one or more windings are not conducting the whole period, the AC resistance is drastically different depending on which windings are conducting at a given point of time.</li>
                            <li>We should be able to apply Dowell to multi secondaries magnetics, as long as all the windings are conducting all the period and the mmf has no local minima.</li>
                            <li>We shouldn't use Dowell's method for Flyback, Forward, Push-Pull, Weinberg, some Half and Full bridges, and probably some more I am forgetting. <a href="https://www.youtube.com/watch?v=ccenFp_3kq8">No can do</a> </li>
                        </ul>
                        <p>If we apply these implications to a common case like Flyback, they mean:</p>
                        <ul>
                            <li>The AC resistance of the inductor depends not only on the voltages, switching frequency and power, but also on the duty cycle.</li>
                            <li>The current of secondary is affecting the AC losses of the primary, and vice versa.</li>
                            <li>During the conducting time of the primary (t1), the losses are:</li>
                            <ul>
                                <li>Primary: DC, skin, and proximity due to the current through itself.</li>
                                <li>Secondary: Proximity due to the current through the primary.</li>
                            </ul>
                            <li>During the conducting time of the secondary(t2), the losses are:</li>
                            <ul>
                                <li>Primary: Proximity due to the current through the secondary.</li>
                                <li>Secondary: DC, skin, and proximity due to the current through itself.</li>
                            </ul>
                        </ul>
                        <img src="/src/assets/images/musings/1/image1.png" class="img-fluid bounce-little my-3" alt="">
                        <p class="p">Regretfully originally published in https://drmolina.substack.com/p/5-mergence-transformer-best-f1-championship</p>
                    </div>
                </div>
            </div>
        </div>
    </main>
    <Footer />
</template>

