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
                    <h1 class="text-white">Alf’s Musings #1</h1>
                    <div class="user d-flex align-items-start justify-content-between bg-secondary p-4 rounded">
                        <div class="d-flex align-items-start">
                            <div class="d-block">
                                <span class="d-block text-white">by <a class="h6" >Alfonso Martínez</a></span>
                                <span class="d-block text-muted">7th Dec 2021</span>
                            </div>
                        </div>
                    </div>
                    <!--//blog section-->
                    <div class="blog-section text-white">
                        <p>It is 1966. The Vietnam War is raging while the hippie movement grows. My beloved Doors record their <a href="https://www.youtube.com/watch?v=w6LiHXsBmmA">first album</a>, while Sinatra and Cash are collecting everything not taken by the Beach Boys. Walt Disney <s><a href="https://www.bbc.com/culture/article/20190426-was-walt-disney-frozen-after-death">gets cryogenized</a></s> dies. Electric appliances are arriving in American kitchens, and a weird series called Star Trek is debuting on TV. Europe looks worried at the 23rd Congress of the Communist Party of the Soviet Union, while in Berlin people can cross the Wall to celebrate Christmas.</p>
                        <p>But for us Engineers, something else happened in Denmark in 1966: P. L. Dowell published his famous paper “Effects of eddy currents in transformer windings”. And I can assure you I see more people infatuated as of today with his equations than with The Doors.</p>
                        <p>So I have decided to dedicate my first and only number (for now) in a series of Alf’s Musings to P. L. Dowell. Concretely to why you shouldn’t use Dowell’s method to design your transformers.</p>
                        <p>Let’s start at the beginning, we don’t know much about P.L. Dowell apart from his <s>being a time-traveller</s> papers, so let’s focus on it. In the introduction he clarifies how preceding engineers have developed equations for slot-wound-armature conductors, so he decides to apply the same principles to the windings of a transformer, a valiant effort and the first stone for all the work done in the decades. Since then it has been cited 1091 times (as of December 2021), included in any good book about magnetics, and used for most medium-high advanced magnetic designs.</p>
                        <p>Dowell's method consists of an easy-to-implement equation, that given a frequency, number of layers and conductor width it will give you the AC factor of a given inductor, which represents the proportion of the resistance the winding has at a certain frequency divided by its resistance at DC.</p>
                        <img src="/src/public/images/musings/1/image3.png" class="img-fluid bounce-little my-3" alt="">
                        <p>At the time it was really an amazing solution, and the author even provided a series of graphs (Dowell’s curves) that quickly allow you to point out your AC factor depending on the diameter of your wire and the skin depth at your operating frequency. At a time when there were no calculators, no excel sheets, no personal computers, these curves were really good! So good that there are still people using them instead of the equations, which is quite <s>stupid</s> anachronic, since they are just adding the <a href="https://www.proquest.com/openview/7e3ada66539c829c90ebf8bf48ed1c63/1?pq-origsite=gscholar&cbl=1820938">thick point</a> error to Dowell’s error, and just gaining more dioptres.</p>
                        <img src="/src/public/images/musings/1/image4.png" class="img-fluid bounce-little my-3" alt="">
                        <p>I have divided my explanation into several pitfalls,let’s begin with the first!</p>
                        <h1 class="h2">The first pitfall: singular, dual, plural</h1>
                        <p>Dowell’s method can be readily summarized: you calculate your DC resistance, calculate the AC factor given by his equation, you multiply and there you have your AC resistance and your winding losses. Easy peasy. And since the AC resistance is extremely difficult to measure, and extremely important at high frequencies, nobody questioned a method that gives you a simple solution to a difficult problem.</p>
                        <p>And here comes the first pitfall: since you have one DC resistance per winding, people expect to have one AC resistance per winding too. So how do they do it? They apply Dowell to each winding, with its own number of layers. And now they can multiple by the square of each current and there you have the winding losses! And they told me magnetics were difficult…</p>
                        <img src="/src/public/images/musings/1/image2.png" class="img-fluid bounce-little my-3" alt="">
                        <p>Maybe this gets a bit on the realms of opinion, but the AC resistance is a virtual construct we engineers to have an equivalent model for the AC losses as we have for the DC losses. And this virtual AC resistance should be either a matrix or an unique value, not a value per winding. And the reason is simple, though the explanation is complex. The losses happening in an individual turn inside a transformer winding comes from three sources: </p>
                        <ol>
                            <li>The ohmic losses due to its own DC resistance and its DC current.</li>
                            <li>The skin losses, which consist also of ohmic losses due to the component of the AC current of a given harmonic and the skin resistance at the frequency of the harmonic. This skin resistance is similar to the DC resistance, but taking into account the reduction in area produced by the skin effect at the harmonic frequency.</li>
                            <li>The proximity losses, which are similarly ohmic losses, but in this case the current that produces them is induced from the H field surrounding the turn, which is produced by the rest of the <u>conducting</u> turns in the magnetic. And reciprocally, our individual turn is also inducing current in the rest.</li>
                        </ol>
                        <p>This means the losses in a turn come from two main excitations: the current circulating through it, DC and AC; and the AC current circulating in other turns. From this we can extract certain implications:</p>
                        <ul>
                            <li>The AC resistance is not a fixed value depending only on the construction of the magnetic.</li>
                            <li>The AC losses of a wiring is not uniquely dependent on its current.</li>
                            <li>The AC depends on the current <u>waveform of every winding</u>, including all its harmonic amplitudes, frequencies and phases.</li>
                            <li>My favorite one is this: If we are using Litz wire, every strand behaves like a turn, and is producing proximity losses on the rest, additionally of the losses produced from turn to turn. This is commonly referred to as Internal Proximity Effect, and <a href="https://ieeexplore.ieee.org/document/880550">studied by Profesor Albach</a>.</li>
                            <li>Adding more parallels to a wiring to decrease the DC resistance might increase our total losses.</li>
                        </ul>
                        <p>There are a couple extra implications, but I am reserving those for the next section.</p>
                        <p>If we apply these implications to a common case like a Phase-Shifted Full Bridge, they mean:</p>
                        <ul>
                            <li>The current of secondary is affecting the AC losses of the primary, and vice versa.</li>
                            <li>The energy producing these losses is just not created or <a href="https://doom.fandom.com/wiki/Argent_Energy">extracted from Hell</a>, it comes from your source, and it also increases the current in primary, which also increases losses…</li>
                        </ul>

                        <p>TL;DR To wrap all this up, the AC resistance of a winding depends on the current circulating through the winding, and the current circulating through the rest of the windings. Which is why in advanced literature it is referred to as a NxN matrix, with N being the number of windings. But since common engineers get nervous with complex math (<a href="https://dilbert.com/strip/2010-10-04">Dilbert</a> was wrong!), we tend to prefer working with parameters that we can calculate with our <a href="https://www.casio.com/products/watches/databank/ca53w-1">CA53W-1</a> or excel. Which is the reason for the (in my opinion) wrong initial approach. So to be so bold as to propose something:</p>
                        <p class="lead mt-3 bg-secondary">
                            Let’s accept the nature of the AC resistance, and start working with only ONE value for the whole magnetic, a global AC resistance value.
                        </p>
                        <p>And what about if I want to calculate the losses in each winding? That’s fine, there is an amount of losses per winding, but its calculation means working with a matrix. <a href="https://knowyourmeme.com/memes/deal-with-it">Deal with it</a>.</p>
                        <p>Wait, I said I was talking about Dowell. Does it mean Dowell’s method is wrong? No and yes.</p>
                        <p>His initial approach, where he calculates the leakage inductance and resistance, was done for a magnetic with any number of windings, and is a valid interpretation.</p>
                        <p>The problem comes in the second part, when he continues his reasoning trying to calculate the AC resistance of a magnetic. All the calculations in this section are based on a continuously increasing MMF (as in an inductor or non-interleaved transformer) to extract his famous equations. So the moment you have a different case, e. g. an uneven number of layers in one winding and even in the other, applying this method would be wrong.</p>
                        <p>Sure, that is not such a common case, but I haven’t finished yet, there are a few more pitfalls!</p>
                        <img src="/src/public/images/musings/1/image1.png" class="img-fluid bounce-little my-3" alt="">
                        <p class="p">Regretfully originally published in https://drmolina.substack.com/p/4-deep-tech-projects-and-alfs-musings</p>
                    </div>
                </div>
            </div>
        </div>
    </main>
    <Footer />
</template>

