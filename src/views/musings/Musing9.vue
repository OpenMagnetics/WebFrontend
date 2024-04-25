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
                    <h1 class="text-white">Alf’s Musings #9</h1>
                    <div class="user d-flex align-items-start justify-content-between bg-secondary p-4 rounded">
                        <div class="d-flex align-items-start">
                            <div class="d-block">
                                <span class="d-block text-white">by <a class="h6">Alfonso Martínez</a></span>
                                <span class="d-block text-muted">15th Dec 2022</span>
                            </div>
                        </div>
                    </div>
                    <!--//blog section-->
                    <div class="blog-section text-white">
                        <h2 class="h2">A bit out of context</h2>
                        <p>
                        Magnetics are said to be getting fancy, or at least that is what people in magnetics say, which might be a little biased… but regardless, reality is that the latest advances in semiconductor devices are moving the bottleneck little by little to the magnetic components, where (and this is totally yours truly’s opinion) there have been comparable less exchange of ideas between academia, research centers, and industry. But I like to back my opinions with data, so I did a quick study over the publications in IEEE.
                        </p>
                        <p>

                        I grouped per decade the total number of publications regarding the following topics: MOSFETs, Other semiconductors, Power transformers, and Power Inductors. I know this is a topic for a broader discussion and deeper data analysis (which I will do the moment IEEE approves my API access, as the best way of doing data engineering is by automating it), but at least this small brushstroke will allow us some insight in the current state of the art.
                        </p>
                        <p>

                        The data I obtained and worked with is the following:
                        </p>
                        <img src="/images/musings/9/image1.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="Table with number of publications per topic per decade" width="600" height="auto">
                        <p>

                        We can easily observe how the number of publications regarding MOSFET and Semiconductors started to grow some decades before the ones regarding Magnetics, but in order to better ascertain it, I aggregated the data into two graphs. The first one represents the relative grow on each topic over that decade:
                        </p>
                        <img src="/images/musings/9/image2.svg" class="img-fluid bounce-little my-3 mx-auto d-block" alt="Increase in relative publications per decade" width="600" height="auto">
                        <p>

                        We can see how, even as the total number of publications has grown immensely in the last decades, it is in the last decade when the Power Transformers and Power Inductors have had the biggest growth.
                        In the second and last graph I have aggregated over the percentage of total publications of that decade:
                        </p>
                        <img src="/images/musings/9/image3.svg" class="img-fluid bounce-little my-3 mx-auto d-block" alt="Proportion of topic per decade" width="600" height="auto">
                        <p>

                        And we can easily observe how MOSFETs publications have passed from being almost 100% to being closer to 50% in the last decade, as the interest of research centers and academia is moving towards magnetic components.
                        </p>
                        <p>

                        I don’t want to get further into this data analysis, as I believe it deserves a Musing (or more) for itself. I just wanted to bring forth some data about the common saying that “Magnetics are the bottleneck”. I cannot prove they are, but I can at least prove that they are gaining more and more attention, which might be correlated with being a bigger and bigger problem.
                        </p>

                        <h2 class="h2">The Inductance problem</h2>
                        <p>
                        But I announced that this number (or series) of Alf’s Musings was going to be about Inductance. And it is.
                        </p>
                        <p>
                        Because taking into account all increased interest in Magnetics, many of the topics are always referring to Leakage Inductance or Core Losses, while really few are talking about the main characteristic of a Magnetic component: its Inductance.
                        </p>
                        <p>

                        I am not going to get too theoretical on the topic, whoever is looking to learn about <a href="https://en.wikipedia.org/wiki/Inductance#Mutual_inductance">Mutual inductance</a>, <a href="https://en.wikipedia.org/wiki/Inductance#Self-inductance_of_a_wire_loop">Self-inductance</a>, or <a href="https://en.wikipedia.org/wiki/Magnetic_flux">Magnetic flux</a>, can go to Wikipedia, they have really nice articles. Or even better, check <a href="https://www.youtube.com/user/sambenyaakov">Sam Ben-Yaakov‘s Youtube channel</a>.
                        </p>
                        <p>
                        I am going to focus my article on how we, as Engineers, calculate the inductance of our magnetic components. And the reality is that most Engineers don’t care to calculate the inductance with any accuracy, as it is something that is easily measurable, preferring to just go with a simple approximation, building it and correcting the gap or the turns on the fly. We all love to play with our gadgets, but this method is something closer to artisanry than to modern Electronics, this is not how we advance our technology.
                        </p>
                        <p>
                        Inductance modeling is not something that get complex quickly, like the Leakage Inductance or the Winding losses, it is something that can be done following the classical equations and being meticulous with the dimensions we use (Again: <a href="https://www.linkedin.com/pulse/alfs-musings-6-alfonso-mart%C3%ADnez-de-la-torre/">never use the core effective area to calculate the air gap!</a>)
                        </p>
                        <p>
                        But as I stated in the introduction, let me back my opinions with data.
                        </p>

                        <h3 class="h3">The AL Value or Inductance Factor method</h3>
                        
                        <p>
                        The most extended method, and unsurprisingly the simplest, is to just use what is called the “AL value” or “Inductance factor” of a magnetic core, gapped or ungapped, which is nothing else than the bulk <a href="https://en.wikipedia.org/wiki/Permeance">permeance</a> of our core. To calculate the Inductance of a magnetic component from whose core we know the AL value we just have to multiply it by the square of the number of turns, and that’s it.
                        </p>
                        <img src="/images/musings/9/image5.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="AL value method for inductance" width="200" height="auto">
                        <p>
                        The main advantage of this method is evidently its simplicity, it’s just a quick operation that can be even done by pen and paper.
                        The disadvantages are a bit more serious. These values are usually given by the manufacturers in their core datasheet, so this means they are only valid for the material and gapping that comes with the value. Do you want to modify the gap or use a spacer? Out of luck!
                        </p>
                        <p>
                        A little bit more unknown caveat is that these values are obtained under strict conditions, that normally imply using the method sold by the same manufacturer to mechanically fix the core sets to each other. So that means that if you plan to put together your magnetic with tape or glue, the AL value will be different. This is due to the residual gaps, but we will talk about that later.
                        </p>
                        <img src="/images/musings/9/image4.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="Inductance factor for different gaps" width="500" height="auto">
                        <p class="text-center">
                        Inductance factor table for different gaps from a manufacturer
                        </p>
                        <p>

                        Finally, another problem with this method is that it is not temperature dependent, which can be fine for gapped cores, as the permeability of the free space does not vary with temperature rise and the gap is what contributes the most at the AL value. But in the case of ungapped cores, the main dependance of the AL value is the core permeability, which in turn depends on the temperature (and the H field and frequency, but we will talk about this also later), so you Inductance factor will go crazy with variations of temperature in your core.
                        But our inductor never heats, right? 🙂
                        </p>

                        <h3 class="h3">The Classical or “I will adjust it later” method</h3>
                        
                        <p>
                        Probably the single most used method when spacers are used, it relies on the classical equation that we are taught in Electromagnetism 101:
                        </p>
                        <p>

                        <img src="/images/musings/9/image6.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="Classical equation for calculating inductance" width="200" height="auto">
                        Or if we assume that lc >>> lg (which is false in many cases) then the equation can be approximated to:
                        </p>
                        <p>

                        <img src="/images/musings/9/image7.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="Classical approximated equation for calculating inductance" width="500" height="auto">
                        Which, let’s face it, it’s perfect for Excel, and it’s the reason why many Engineers use it, they don’t have to deal with god-forsaken software programming.
                        </p>
                        <p>
                        But, is it really a good enough approximation? Not by far, and this method has a second part (which I was ranting about in the introduction) that involves going to the laboratory and adjusting the gap to match while measuring the inductance, until it matches what we want.
                        </p>
                        <p>
                        At the end, the formula is just used as a starting point for our artisanry, making this method time-consuming and without real knowledge feedback that will help us next time to estimate better.
                        </p>
                        <p>
                        Additionally, it suffers from the same problem as the previous one regarding temperature.
                        </p>

                        <h3 class="h3">Finite Element method</h3>
                        
                        <p>
                        I jumped directly to the most complex of all the methods, but I don’t want to spend too much time on it, as this is a really broad subject, worthy of many more pages.
                        </p>
                        <p>
                        In simple words, Finite Elements models break down the component under tests into millions of small parts, and apply the Physical equations to those small parts, adding them later together to obtain the bulk result.
                        </p>
                        <p>
                        Although creating a complete Finite Elements model of a magnetic component can be a herculean task, if we just want to do it in order to extract the inductance value can reduce the amount of work necessary.
                        </p>

                        <img src="/images/musings/9/image8.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="Magnetic flux density in FInite Element simulation" width="800" height="auto">
                        <p class="text-center">
                        3D vs 2D Magnetic Flux Density Field with FE simulation
                        </p>
                        <p>

                        For this case we would just need a 3D representation (2D is also possible, but not as good) of our magnetic core, including the gaps; and a setup with the number of turns, and of course the material permeability.
                        </p>
                        <p>
                        The advantage of this method is that, additionally to its high accuracy, the permeability versus temperature values can be introduced as a lookup table, and the temperature can be used as a variable.
                        </p>
                        <p>
                        I know, having a 3D of our core is not so simple, especially for custom cores. <a href="https://openmagnetics.com/core">If only we had a tool that gives us that</a>
                        </p>


                        <h3 class="h3">The Magnetic Circuit method</h3>

                        <p>
                        I might have intentionally left my favorite for the last one, but hey, it’s my article :)
                        </p>
                        <p>
                        I consider this model to be the one that best balances the complexity versus the accuracy, can be easily automated in a Spreadsheet or code, and allows for the use of different submodules that might improve the accuracy for certain cases.
                        </p>
                        <p>

                        It is based on the <a href="https://en.wikipedia.org/wiki/Magnetic_circuit#Resistance%E2%80%93reluctance_model">Resistance-Reluctance model</a>, and applied to the inductance calculation it is reduced to calculating the Reluctance of our core. If you don’t know what the reluctance is, you can read more <a href="https://en.wikipedia.org/wiki/Magnetic_reluctance">here</a>. And once we have the reluctance (ℜ), as it is the inverse of the permeance/AL value, we just have to do:
                        </p>
                        <p>
                        <img src="/images/musings/9/image9.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="Inductance from number of turns and reluctance" width="200" height="auto">
                        Of courses, the trick here is to get the right reluctance. For that we need to calculate two other reluctances, one for the core and one for the air gap(s).
                        </p>
                        <p>
                        The reluctance of the core will depend on its core parameters (effective length and area) and its permeability (a function of the temperature, H field and frequency). This calculation is another topic and will be told another time (I promise I will do an Alf’s Musing especially for it)
                        </p>
                        <p>
                        The reluctance for the air gap(s) is the most important parameter of this equation, as it's where most of the energy will be stored, and we can calculate it in two ways:
                        </p>
                        <ul>
                            <li>We can assume there is no fringing flux, and we will end up using the same formula shown a couple of sections above, which is not really accurate.</li>
                            <li>We can take into account the fringing flux and use it to optimize our gap.</li>
                        </ul>
                        
                        <p>
                        The <a href="https://e-magnetica.pl/flux_fringing">fringing flux</a> is a distortion of the magnetic flux as it changes from circulating from a high permeability medium, like the magnetic core, to a low one, like the air. The consequences of this distortion is that the volume where the magnetic flux travels is expanded, its area larger, which is translated into a smaller reluctance and a larger volume to store energy, decreasing the gap necessary to achieve our requirements.
                        </p>
                        <p>

                        This increase in aig gap volume is usually called “Fringing Factor”, expressed in percentage, and it is a measure of how much extra energy is stored in a gap. It is a positive thing from the inductance point of view, but it is also detrimental for any wire in the vicinity, as it will generate extra losses and heating in any conductor.
                        </p>
                        <img src="/images/musings/9/image10.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="distributed gaps in all columns in magnetic core shape ETD" width="600" height="auto">
                        <p class="text-center">
                        The reluctance method allows for any gapping configuration, no matter how crazy.
                        </p>
                        <p>


                        We’ll talk a bit more on the section on how to calculate the gap fringing factor/reluctance, but before we finish I want to correct something said: there are really not two reluctances in our circuit, there are one per each gap, including residual gaps; plus the core reluctance can be divided into smaller chunk and calculated with the dimensions of that chunk instead of with the effective parameters.
                        </p>
                        <p>

                        To finally obtain the bulk reluctance that will give us our inductance, we have to place them in series and parallel, as if the magnetic flux were the current of a circuit, and solve using the same techniques as if the reluctances were resistances.
                        </p>
                        <img src="/images/musings/9/image11.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="Example of magnetic reluctance circuit for transformer" width="600" height="auto">
                        <p class="text-center">

                        Example a magnetic circuit and its Resistance–reluctance model
                        </p>
                        <p>

                        The disadvantage of this method is that we have to calculate one reluctance per each distinct gap we have, and then solve the circuit. Simple as this is, we are forced to think in terms of the magnetic flux and knowing how the magnetic field will behave. This might also be an advantage, as we learn.
                        </p>
                        <p>
                        The real advantage of this model is that it allows us to calculate any possible gap configuration: ground in a column, with a shaper that separates the piece, distributed along a column or even take into account the residual gap that always exists between two pieces put together.
                        </p>
                        <p>

                        I know this article has already been going for far too long, but allow me, dear reader, to wrap up with the following steps.
                        </p>
                        <p>

                        We will work further on the reluctance model, and we will review all available models for each of the two types of permeabilities we talked about, core and air gap. And because Science without peer review is just marketing, and I am Engineer, I will add a validation dataset from reluctance measurements and publish the error of standard deviation of each of the models we discussed. And because I believe in Open-Source, I will publish the code for each of these models. so any of you can replicate them.
                        </p>
                        <p>

                        Finally, if anyone reading this has developed or is developing a reluctance model, and wants it to be included, please let me know in the comments and I will include it in the next numbers of Alf’s Musings.
                        </p>


                    </div>
                </div>
            </div>
        </div>
    </main>
    <Footer />
</template>

