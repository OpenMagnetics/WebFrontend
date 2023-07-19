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
                        <h2 class="h2">Previously on <s><a href="https://frenetic.ai">Lost</a></s> Alf’s Musings</h2>
                        <p>In the previous issue, we discussed the limitations of Dowell's assumptions when windings are not conducting continuously, and cautioned against using his method for topologies such as Flyback or Forward. However, we did not delve into all the intricacies of this topic, particularly with regards to non-sinusoidal waveforms. Let's now explore this further.</p>

                        <h2 class="h2">The third pitfall: Frequency is legion</h2>
                        <p>In the year 1822, <a href="https://en.wikipedia.org/wiki/Joseph_Fourier">Joseph Fourier</a> made a significant contribution to engineering through his research on the Fourier Series. To avoid delving too much into the mathematical details, let's take a brief look at how this applies to the field of power electronics.</p>
                        <p>In the context of converters, the signals generated are often not ideal or sinusoidal, especially when it comes to currents. They typically fall somewhere between triangular and sinusoidal, but in some cases, like in Flyback converters, they can become quite complex. While it's true that there is a triangular waveform that results from the addition of the primary and secondary windings, it's important to note that each individual winding only experiences a portion of it.</p>
                        <p>By using the Fourier Transform, it is possible to convert non-sinusoidal signals, which are common in power electronics, into a sum of an infinite number of sinusoidal waveforms, known as harmonics.</p>
                        <p>These harmonics refer to the distortion from an ideal, pure sinusoidal waveform, and generally, the more harmonics a signal has, the higher the amount of losses it incurs. The amplitude of these harmonics can vary significantly and can be quite moderate, from what is observed in LLC converters:</p>
                        <img src="/images/musings/3/image2.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="LLC few harmonics waveform" width="989" height="281">
                        <p>To quite high, as observed in a Flyback converter:</p>
                        <img src="/images/musings/3/image3.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="Flyback many harmonics waveform" width="989" height="281">
                        <p>But I am digressing. To return to the topic of Dowell, it's worth noting that the technology he worked with was less advanced than what we have today, particularly in terms of active components. As a result, the waveforms of the time were generally lower frequency and closer to sinusoidal. This explains why Dowell's paper doesn't address the issue of harmonics in non-conducting windings. In fact, if we take a brief look at Dowell's paper:</p>
                        <img src="/images/musings/3/image4.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="Dowell is for typical communication transformers" width="600" height="81">
                        <p>In his paper, Dowell argues that some of his assumptions are justified and cites another document to support his claim, which is a valid approach. However, upon examining the source(<a href="https://worldradiohistory.com/hd2/IDX-UK/Technology/Technology-All-Eras/Archive-Experimental-Wireless-IDX/IDX/30s/Wireless-Engineer-1938-02-IDX-3.pdf">Design of audio frequency input and intervalve transformers</a>), it becomes clear that the frequencies Dowell used in his work did not exceed 10kHz (or 10 kc/s, as they write it). It is important for engineers to remember this fact when applying Dowell's equation to transformers operating at 200kHz.</p>
                        <p>All this just to end up saying we should not apply Dowell’s method to waveforms different from sinusoidal waveforms. No wonder my wife tells me I am exasperating. </p>
                        <p>There is a solution to the issue of dealing with distorted waveforms. As previously discussed, the Fourier Transform can break down a complex waveform into an infinite sum of sinusoidal components. With this in mind, we may be able to apply Dowell's equation to each individual harmonic, extracting the winding losses and summing them up. However, caution must be exercised when using this method.</p>
                        <p>From a mathematical standpoint, the Fourier Transform yields an infinite number of terms, but <a href="https://memegenerator.net/img/instances/45625912/chuck-norris-counted-to-infinity-twice.jpg">cannot add infinite</a> of losses. To address this issue, engineers usually ignore any harmonic whose power is below a certain threshold that they are comfortable with. However, it is risky to simply neglect harmonics beyond the first negligible one. This is because the power of the harmonics does not necessarily decrease monotonically, and high-frequency harmonics may have significant power even if earlier ones are negligible.</p>
                        <p>The previous section addressed a second issue that requires caution: non-continuous waveforms. When using the Fourier Transform to analyze a Flyback primary waveform, each harmonic is transformed into a continuous waveform, which would imply the generation of skin effect losses in the primary and proximity effect losses in the rest of the turns throughout the entire period. However, as previously discussed, during the off time of the period, there are no skin effect losses in the primary and no proximity effect on the secondary turns due to primary turns. Blindly applying Dowell's equation to a Flyback using harmonic decomposition without accounting for the conducting times could result in significant inaccuracies. Do it at your own risk.</p>
                        <p>I don’t want to conclude this series of Musings centered in Dowell without clearly saying that I believe he was one of the founders of magnetic design as we know it nowadays. His method was really innovative and the line of research created by it has not finished as of 2023. My only intention with this (constructive, I hope) critical analysis was helping people realize how and why Dowell’s method can be used and when they are not doing a service to themselves as engineers and to the memory of a great Scientist.</p>

                        <h2 class="h2">The second-derivative pitfalls: the design phase</h2>
                        <p>The preceding sections predominantly addressed (or tried to address at least) the physical phenomena occurring in and around the turns of a magnetic, though a few more far-reaching implications were also mentioned. In this additional section, I would like to emphasize those.</p>
                        <p>Earlier, we discussed the concept of harmonics and how we could calculate the losses associated with each harmonic and add them up to obtain the total losses in the wire. However, this has a broader implication: it suggests that there are multiple currents flowing through the conductor at successive frequencies, each with a distinct skin depth.</p>
                        <p>As engineers, we tend to make pragmatic decisions, and one of those is to select a conducting width for our wires based on the switching frequency. This decision is made to minimize the losses attributed to skin effect. However, have we considered the impact of harmonics on our decision?</p>
                        <p>If we didn’t, the result is that we opted for a narrow wire to mitigate skin effect at our switching frequency, but disregarded the skin effect losses of the harmonics. As a consequence, there could be a significant current flowing through a much smaller area, leading to higher resistance and producing unwarranted losses at higher frequencies.</p>
                        <p>My personal preference when selecting the wire diameter for a transformer is to consider the "effective frequency." This value represents the weighted frequencies of all the harmonics in a waveform and can be found in sources such as those listed <a href="https://www.semanticscholar.org/paper/The-analysis-of-eddy-currents-Stoll/bb9deef744c01d60981cc8877cb167921cee6aad">here</a> and <a href="https://engineering.dartmouth.edu/inductor/papers/litzj.pdf">here</a>, for those who are interested. By taking the effective frequency into account, we can calculate the effective skin depth and choose a wire diameter that accounts for the impact of harmonics as well.</p>
                        <img src="/images/musings/3/image1.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="Magnetic heating due to harmonics" width="450" height="316">
                        <p>However, it's important to note that this approach has limitations. While it considers skin effect losses, it neglects the impact of proximity effect.</p>
                        <p>This <s>negligence</s> neglection will lead us to the next design pitfall: using too many parallels. And with parallel I also mean the number of strands inside a Litz wire.</p>
                        <p>In the case of designing for high frequencies, whether it's for switching or effective frequency, we can conclude based on what we have learned that the best approach is to choose a larger conductor diameter that allows us to minimize skin effect losses and add parallel wires or strands until we can safely carry the required current density.</p>

                        <p>While that approach may be effective for lower frequencies, it becomes less so as the frequency of the harmonic increases. This is because as the frequency rises, so do the proximity effect losses between each turn and the other turns.</p>
                        <p>Suppose we encounter a scenario where a magnetic component has numerous turns but only one parallel, and we are uneasy about the high current density and the resulting temperature increase in the winding. We decide to add another parallel, effectively doubling the number of physical turns and reducing the current density by half, only to discover that a component that was previously on the brink of burning up has now become a supernova.</p>
                        <p></p>

                        <p><a href="https://memegenerator.net/instance/68970861/ancient-aliens-iim-not-saying-its-possible-but-its-possible">How is that possible?</a> Essentially, by doubling the number of turns, we decreased the direct current losses by half. However, the number of interactions between the wires due to the proximity effect were <b>squared</b>. As a result, the increase in proximity effect losses due to the new turns could be greater than the decrease in DC losses. This is especially true for harmonics with high frequency and significant power.</p>
                        <p>Essentially, by doubling the number of turns, we decreased the direct current losses by half. However, the number of interactions between the wires due to the proximity effect were squared. As a result, the increase in proximity effect losses due to the new turns could be greater than the decrease in DC losses. This is especially true for harmonics with high frequency and significant power.</p>
                        <img src="/images/musings/3/image5.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="Vegeta proximity effect over 9000" width="600" height="446">
                        <p>And this is the end of the series about Dowell, next chapter we will talk about the core. Until then!</p>
                    </div>
                </div>
            </div>
        </div>
    </main>
    <Footer />
</template>

