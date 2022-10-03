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
                    <h1 class="text-white">Alf’s Musings #3</h1>
                    <div class="user d-flex align-items-start justify-content-between bg-secondary p-4 rounded">
                        <div class="d-flex align-items-start">
                            <div class="d-block">
                                <span class="d-block text-white">by <a class="h6">Alfonso Martínez</a></span>
                                <span class="d-block text-muted">23rd Dec 2021</span>
                            </div>
                        </div>
                    </div>
                    <!--//blog section-->
                    <div class="blog-section text-white">
                        <h1 class="h2">Previously on <s><a href="https://frenetic.ai">Lost</a></s> Alf’s Musings</h1>
                        <p>In the previous number we commented how having windings that are not conducting the whole time can invalidate Dowell’s assumptions and how we should not use his method for topologies like Flyback or Forward. But we left a few details out of the discussion, especially regarding non-sinusoidal waveforms. Let 's discuss them.</p>

                        <h1 class="h2">The third pitfall: Frequency is legion</h1>
                        <p>In 1822, <a href="https://en.wikipedia.org/wiki/Joseph_Fourier">Joseph Fourier</a> presented his work, and <s>maybe</s> the most important contribution to engineering was his investigations in the Fourier Series. I don’t want to get too mathematical, so let’s quickly review the power electronics side of his works.</p>
                        <p>When we are working in a converter, the signals produced are <s>almost</s> never sinusoidal, or ideal, especially for the case of the currents. Commonly they are in an intermediate point between triangular and sinusoidal, but they can get as crazy as the Flyback. Yes, I know that between primary and secondary there add up a triangular, but the reality is that an individual winding suffers just a chunk of it.</p>
                        <p>So, applying Fourier Transform, we can transform any of these weird signals into an infinite number of superposed sinusoidal waveforms, and these waveforms are what we call the harmonics of a signal.</p>
                        <p>These harmonics represent the distortion from an ideal, pure sinusoidal waveform, and as a rule, the more harmonics in your signals the more losses you will have. Their value can range from quite moderate, as in a LLC:</p>
                        <img src="/src/assets/images/musings/3/image2.png" class="img-fluid bounce-little my-3" alt="">
                        <p>To quite high, as in a Flyback:</p>
                        <img src="/src/assets/images/musings/3/image3.png" class="img-fluid bounce-little my-3" alt="">
                        <p>But I am digressing, we were talking about Dowell. At the time of Dowell work, the technology was not as advanced as today, especially active components, so the waveforms they were working with were generally at lower frequencies and closer to sinusoidals. Which is why in his paper Dowell never worries about harmonics, on non-conducting windings.</p>
                        <p>As a reference to this topic, we could check an small extract from Dowell’s paper:</p>
                        <img src="/src/assets/images/musings/3/image4.png" class="img-fluid bounce-little my-3" alt="">
                        <p>In it he argues that some of his assumptions are justifiable and refers to another document for this justification, which is totally legit. But if we check the source (<a href="https://worldradiohistory.com/hd2/IDX-UK/Technology/Technology-All-Eras/Archive-Experimental-Wireless-IDX/IDX/30s/Wireless-Engineer-1938-02-IDX-3.pdf">Design of audio frequency input and intervalve transformers</a>) we observe how the frequencies Dowell refers to are not greater than 10kHz (or as they write it 10 kc/s). More than one engineer should remember this the next time they apply Dowell’s equation to a 200kHz transformer.</p>
                        <p>All this to say that Dowell’s method should be applied only to sinusoidal waveforms. No wonder my wife tells me I am exasperating.</p>
                        <p>But there is hope! We were talking at the beginning about the Fourier Transform and how it can convert a weird waveform into a (infinite) sum of sinusoidal ones. So, could we apply Dowell’s equation to each of these harmonics, extracting the winding losses of each harmonic and adding them? Yes, but with care.</p>
                        <p>First, mathematically talking, in a Fourier Transform there are infinite terms, but we engineers <a href="https://memegenerator.net/img/instances/45625912/chuck-norris-counted-to-infinity-twice.jpg">cannot add infinite</a> losses. Usually this is solved by neglecting any harmonic with a power smaller than a threshold we find ourselves comfortable with. The only dangerous part would be finding the first negligible harmonics and ignoring from that frequency upward. </p>
                        <p>That’s a bad idea, because the power in the harmonics is not monotonously decreasing, and many times there are high frequency harmonics with non-negligible power, even if the previous ones are.</p>
                        <p>The second issue to be careful with is the discussed in the previous section, the non-continuous waveforms. When you transform a Flyback primary waveform into its Fourier Transform, each harmonic becomes continuous, and that would mean that they are generating skin effect losses in the primary and proximity effect losses in the rest of turns the whole period. But as we discussed in the previous section, the reality is that in the off time of the period, there are no skin effect losses in the primary, and no proximity effect on the secondary turns due to primary turns. If you apply Dowell blindly to a Flyback using harmonic decomposition and without taking care of the conducting times, do it at your own risk.</p>
                        <p>I don’t want to end this series of Musings dedicated to Dowell without explicitly saying that I believe he was one of the foundations of magnetic design as we know it today. His method was really innovative and created a line of investigation that has not finished as of 2021. My only intention with this (constructive, I hope) criticism was helping people understand how and why Dowell’s method can be used and when they are doing a disservice to them as engineers and to the memory of a great Scientist.</p>

                        <h1 class="h2">The second-derivative pitfalls: the design phase</h1>
                        <p>Many of the points discussed in the previous sections were (or tried to be at least) focused on the physics and effects happening in and around the turns of a magnetic, but a few more fat-fetched consequences were mentioned, and I would like to remark those in this extra section.</p>
                        <p>When we talked about the harmonics before, we commented how ideally we could calculate the losses associated with each harmonic and add them to have the total losses in the wire.</p>
                        <p>This has a wider consequence: according to this interpretation we have currents of many successive frequencies circulating through our conductor, each one a different frequency and each one with a different skin depth.</p>
                        <p>So, we, being good and pragmatic engineers, chose a conducting width for our wires based on our switching frequency, in order to minimize the losses due to skin effect. But did we take into account the harmonics?</p>
                        <p>If we didn’t, what happened is that we chose the thinner wire to avoid the skin effect at our switching frequency, but neglected the skin effect losses of the harmonics. In most cases this means that we have a non-negligible amount of current running through a much reduced area (and higher resistance) and therefore producing unnecessary losses.</p>
                        <p>This is a personal opinion of mine, but when I choose the conductor diameter of the wires for a transformer I like to use what is called “effective frequency”, and it represents the weighted frequencies of all harmonics in a waveform (it can be found <a href="https://www.semanticscholar.org/paper/The-analysis-of-eddy-currents-Stoll/bb9deef744c01d60981cc8877cb167921cee6aad">here</a> and <a href="https://engineering.dartmouth.edu/inductor/papers/litzj.pdf">here</a>, for curious ones).</p>
                        <p>Using the effective frequency we can calculate the effective skin depth and with it we can choose a wire taking into account also the harmonics.</p>
                        <img src="/src/assets/images/musings/3/image1.png" class="img-fluid bounce-little my-3" alt="">
                        <p>But this method is no panacea, as it only takes into account the skin effect losses, and forgets about the proximity effect.</p>
                        <p>This <s>negligence</s> neglection helps us go to the next design pitfall: over dimensioning the number of parallels. And with parallel I also mean the number of strands in a Litz wire.</p>
                        <p>If we go to an extreme case of high frequency design (be it switching or effective frequency) we can reason, following what we have learnt, that we should just find the bigger conductor diameter that allows us to neglect skin effect losses and add parallels (or strands) until we can drive all of our current at a safe density.</p>
                        <p>Sure, that works nicely at lower frequencies. But as the frequency of the harmonic grows so grows the proximity effect losses from each turn into the other turns.</p>
                        <p>So, let's say we find ourselves in a case where we have a magnetic component with many turns, but only one parallel, and we are a bit uncomfortable with the high current density we have and the temperature rise it produces in the winding. So, because we have enough window area, we decide to add another parallel, doubling the turns and halving the current density, and suddenly a magnetic that was in the limit of burning up becomes a supernova.</p>
                        <p><a href="https://memegenerator.net/instance/68970861/ancient-aliens-iim-not-saying-its-possible-but-its-possible">How is that possible?</a> Well, we doubled the number of turns, decreasing the DC losses by haf, but the number of proximity interaction between the wires were <u>squared</u>, so it is perfectly possible that the increase in proximity effect losses due to the new turns is higher than the decrease in DC losses. Especially if we have harmonics with high frequency and non-negligible power.</p>
                        <p>This effect is especially accentuated in the case of Litz wire, where decreasing the strand diameter and adding more strands to the bundle not only increases the cost of the wire, but it can also increase the winding losses, as we are drastically increasing the number of proximity interactions between all the strands in the winding window.</p>
                        <img src="/src/assets/images/musings/3/image5.png" class="img-fluid bounce-little my-3" alt="">

                        <p class="p">Regretfully originally published in https://drmolina.substack.com/p/6-power-electronic-problem-spreadsheets</p>
                    </div>
                </div>
            </div>
        </div>
    </main>
    <Footer />
</template>

