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
                    <h1 class="text-white">Alf’s Musings #5</h1>
                    <div class="user d-flex align-items-start justify-content-between bg-secondary p-4 rounded">
                        <div class="d-flex align-items-start">
                            <div class="d-block">
                                <span class="d-block text-white">by <a class="h6">Alfonso Martínez</a></span>
                                <span class="d-block text-muted">29th Jul 2022</span>
                            </div>
                        </div>
                    </div>
                    <!--//blog section-->
                    <div class="blog-section text-white">
                        <p>Over the years working within a Software product for Magnetics I have taken part in many meetings with Sales people. Mostly they were tedious, having to repeat the same Software demo to many a person, answering the <a href="https://en.wikipedia.org/wiki/Sisyphus">same</a> questions... those I don't wish upon anybody, but somebody has to do it. There were a few that were really interesting though, when a customer really got into <s>the mud</s> deep technical discussions and I learned more than I taught.</p>
                        <p>And every time a new sales guy or gal got into the company they sent him or her to me, so I could introduce myself and explain to them what the company was really doing. And this explanation always started with what a magnetic is. And many times to people who have no STEM education, which was never a problem.</p>
                        <p>That is the point where I am going to start, and that is the level I am going to assume. If you, dear reader, find yourself in an advanced point in either case, you can always skip this. Or read it <a href="https://src/assets1.srcdn.com/wordpress/wp-content/uploads/2020/07/Harry-Potter-Umbridge.jpg">looking</a>  to correct me :)</p>
                        <p>A magnetic component is just a <a href="https://commons.wikimedia.org/wiki/File:Big_Chunk_of_Iron_from_the_Skies_%E2%80%94_A_Complete_Campo_(49796495912).jpg#/media/File:Big_Chunk_of_Iron_from_the_Skies_%E2%80%94_A_Complete_Campo_(49796495912).jpg">chunk of iron</a> with wires in its vicinity, where alternating current circulates. The current through these wires creates a magnetic field around them, and this magnetic field finds more comfortable to circulate through the chunk of iron than through the air, so the field concentrates in the iron. And this effect can be used in several ways: we can regulate the fluctuations in the circulating current with this magnetic field, which would make the magnetic an inductor; or we can use the field to induce current in a second wire in the vicinity of the chunk of iron, which would make the magnetic a transformer.</p>
                        <img src="/src/public/images/musings/5/image2.png" class="img-fluid bounce-little my-3" alt="">
                        <p>In both cases, the way to regulate the effect, called induction, is the strength of the magnetic field. But we said that the magnetic field likes to go through the iron, not the air; so we need a chunk of iron big enough that it just goes along all the length of our wire, to protect it from that devilish air. Or, if we want to save material cost, we can just wind the wire around the chunk of iron. And that is why a magnetic is a chunk of iron with wires wound around it.</p>
                        <img src="/src/public/images/musings/5/image1.png" class="img-fluid bounce-little my-3" alt="">
                        <p>But we are engineers, and we find that saying "a chunk of iron" does not comply with the image we want to give to the world of, you know, seriousness and that stuff. So because now it is in the center of our wound wire, we call it core. And though iron cores work, and they are used in some cases, many magnetic cores are made of other, more advanced material, being the most common Ferrite, a ceramic made out of Iron Oxide, blended with small quantities of other metals, like Niquel or Manganese. The main reason for this is that they are more efficient, and we will explain what this means in the Core chapter.</p>
                        <p>We have been talking about magnetics and Electromagnetism, but in reality everybody classifies them in subgroups: by their application: transformer or inductors; or by which property you take advantage of: inductances, chokes, couple inductors, etc. So, are there really many different magnetics? For most electrical engineers yes, a transformer is totally different from an inductor, even ruled by different principles and equations. For this humble writer, no, they are all the same, working under the same principle.</p>
                        <p>And what is that principle? Inertia. The <a href="https://dilbert.com/strip/2014-06-17">resistance to change</a>. Let's work on it with an example:</p>
                        <p>Let's go back to our primitive example of a chunk of iron with a wire near it, where alternating current is flowing. This alternating current, independently of its shape, will have a mean value, and at some point of time the current will be greater than the average, and vice versa.</p>
                        <p>We said that this alternating current produces a magnetic field around it that concentrates in the chunk of iron, and this magnetic field will also alternate. Well, the magnetic field inside the core does not like that at all, so it <a href="https://www.youtube.com/watch?v=LonKGuS9uuQ">resists</a>, it has inertia. When current in the wire is over the mean, the chunk of iron stores that energy in its magnetic field (about the how, we will talk later), siphoning energy out of the wire. And the magnetic field is happy again, no more changes.</p>
                        <p>But then the current reverses, now the value is going under the average. The magnetic field cannot tolerate this change, so it uses the energy stored previously and releases it back to the wire, to compensate for this decrease.</p>
                        <p>And then, suddenly, current goes back over the mean, and the magnetic field goes back to storing. And so on and on, ad eternum, or until we switch it off.</p>
                        <p>What did we achieve with all this? Well the alternating current was softened, filtered. Thanks to our magnetic, its alternating oscillation is much smaller, much closer to continuous current. Which is why this kind of magnetics are called inductors, inductances, chokes, or filters. They are used to pass from AC to DC, thanks to the change-hater magnetic field in our chunk of iron</p>
                        <img src="/src/public/images/musings/5/image3.png" class="img-fluid bounce-little my-3" alt="">
                        <p>Now, let's expand this example. Let's imagine that near our system, formed by our chunk and wire, we add a second wire, without any current. We talked about the reluctance of the magnetic field, but the same happens with the electrical field (actually, they are both the same, the electromagnetic field).</p>
                        <p>Because, <a href="https://c.tenor.com/6xFBul9weRkAAAAC/surprised-meme.gif">surprisingly</a>, if the current (electrical field) produces a magnetic field, this magnetic field will produce an electric field around it.</p>
                        <p>Consequently, when the chunk of iron stored the energy in its magnetic field, this implies that the magnetic field changes too, and this change is looked at with disdain by the electrical field, which also resists this change. And then it finds the second wire, discovering a path of low resistance where it can put the energy that it doesn't want, in the form of electrical current. And this is what we call a transformer: A system that transforms the alternating current from one wire into another wire, while being kept isolated from each other, and all thanks to our reactionary electromagnetic field.</p>
                        <img src="/src/public/images/musings/5/image4.png" class="img-fluid bounce-little my-3" alt="">
                        <p>In both cases, a little (or not so little) part of the system energy is spent in the magnetic field, as the storage is not perfect and it has hysteresis. We will talk about this later, but just to finish this introduction I would like to finish this part with my definition of Electromagnetic Engineering as the process of producing the desired Electromagnetic fields in our core-plus-wires system while trying to lose as little energy as possible.</p>
                    </div>
                </div>
            </div>
        </div>
    </main>
    <Footer />
</template>

