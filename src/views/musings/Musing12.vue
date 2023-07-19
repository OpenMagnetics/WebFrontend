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
                    <h1 class="text-white">Alf’s Musings #12</h1>
                    <div class="user d-flex align-items-start justify-content-between bg-secondary p-4 rounded">
                        <div class="d-flex align-items-start">
                            <div class="d-block">
                                <span class="d-block text-white">by <a class="p">Alfonso Martínez</a></span>
                                <span class="d-block text-muted">22th Jan 2023</span>
                            </div>
                        </div>
                    </div>
                    <div class="blog-section text-white">
                        <h2 class="h2 mt-3">The other Reluctance</h2>
                        <p>
                            We have mentioned in past Alf’s Musings how the inductance of a magnetic component depends on two different kind of reluctances: air gap reluctance, which is the “resistance” that the air imposes to the circulation of the magnetic flux through the gap; and the core reluctance, which is the same concept but when the magnetic flux goes through the core material.
                        </p>
                        <p>
                            In both cases the only non-geometrical variable that affects both reluctances is the permeability of the material that serves as a path for the magnetic field. The permeability (𝜇) of a material is the relationship between the magnetic flux density (B field) produced by  a circulating magnetic field through the material, and the strength of that field (H field).
                        </p>
                        <p class="text-center">
                            B = μ ⋅ H
                        </p>
                        <p>
                            The permeability of the air is almost the same as the permeability of the vacuum, and this means it won’t saturate, and its value will not vary with external factors, such as the temperature.
                        </p>
                        <p>
                            Sadly for us Engineers, that is not the case of the ferromagnetic materials used as magnetic cores. The permeability for these materials is quite unstable, relatively speaking, and its value can change 100%, depending on several factors, such as the temperature of the material, the DC bias of the magnetic field, or its switching frequency.
                        </p>
                        <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/12/image7.webp" alt="Error or each model versus cross sectional area by gap length" width="500" heigth="auto"></p>
                        <p class="text-center">
                            Permeability versus temperature for Ferroxcube 3C96
                        </p>
                        <p>
                            It can look quite daunting, but fear not, dear reader, we are going to take a little trek through the ferromagnetic permeability and see how we can understand and predict its variability.
                        </p>
                        <p>
                            First, let’s make the permeability something more comfortable to work with. The lowest permeability possible would be that of the vacuum (also known as permeability of free space), which was defined until 2019 as:

                        </p>
                        <p class="text-center">
                            μ<sub>0</sub> = 4π ⋅ 10<sup>-7</sup> H/m = 1.25663706143 ⋅ 10<sup>-6</sup> H/m  
                        </p>
                        <p>
                            And in 2019 it was changed during <a href="https://en.wikipedia.org/wiki/2019_redefinition_of_the_SI_base_units">SI units redefinition</a> to:
                        </p>
                        <p class="text-center">
                            μ<sub>0</sub> = 1.25663706212(19) ⋅ 10<sup>-6</sup> H/m  
                        </p>
                        <p>
                            Are you also feeling the urge to go and update a lot of formulas in your datasheets, dear reader?
                        </p>
                        <p>
                            Yes, that’s nice for the vacuum, but what about the ferromagnetic materials? their permeability is much higher than the vacuum, thousands of times higher. So that means that a normal ferrite has an absolute permeability value of μ ∼ 10<sup>-3</sup>, which is not really a comfortable number, and we all <a href="http://irep.ntu.ac.uk/id/eprint/30230/1/7987_Sutton.pdf"> know how easy it is to lose one decimal 0 along the way</a>.
                        </p>
                        <p>
                            To improve this, let’s introduce the relative permeability, which is the absolute one divided by the permeability of the vacuum.
                        </p>
                        <p class="text-center">
                            μ<sub>r</sub> = μ / μ<sub>0</sub>  
                        </p>
                        <p>
                            So now our ferromagnetic material has permeability values of 1000-4000, unitless. A much nicer value. That was easy, let’s go and design some power supplies!
                        </p>
                        <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/12/image8.webp" alt="Error or each model versus cross sectional area by gap length" width="800" heigth="auto"></p>
                        <p>
                            If you really believe it was that easy, I have bad news for you. We talked about how the permeability is the relationship between B and H fields, so if we were to plot B versus H, the permeability would be the slope of the curve. For the vacuum or the air, this curve would be a straight line, but if we take a look at such a plot (the famous BH loop!) for a ferromagnetic material:
                        </p>
                        <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/12/image11.webp" alt="Error or each model versus cross sectional area by gap length" width="500" heigth="auto"></p>
                        <p class="text-center">
                            <a href="https://e-magnetica.pl/user/stan_zurek">S. Zurek</a>, Encyclopedia Magnetica, <a href="http://creativecommons.org/licenses/by/4.0/">CC-BY-4.0</a>
                        </p>
                        <p>
                            Which slope should we get? every point of that curve is a relationship between B and H, are they all permeabilities? Are there more than one? We’ll get into that.
                        </p>
                        <p>
                            Before I would like to talk a bit more about the parameters that affect all points of that BH loop. As we said at the beginning, the permeability of a ferromagnetic medium is highly variable, especially with the temperature. And this is important not only because our inductance may vary, but because the permeability represents the ability of the core to be further magnetized.
                        </p>
                        <p>
                            In general, the permeability of all materials used for magnetic cores depends on 4:
                        </p>
                        <ul>
                            <li>
                                <b>Magnetic flux density</b>: This is the obvious one from the BH loop, the higher the B field, the smaller the slope (and therefore the permeability), until it becomes zero, where we say that the material is saturated and cannot accept more magnetic flux density.</li>
                            <li>
                                <b>Temperature</b>: This is the most common dependency of the permeability, and as a rule of thumb, the permeability decreases with temperature in iron powder cores, and fluctuates in ferrites. In both cases there is a temperature, called Curie temperature, where it drops suddenly and becomes equal to the value in the vacuum, and our material stops being ferromagnetic. For ferrite materials this temperature is around 200ºC, and for iron powder is around 700ºC.</li>
                            <li>
                                <b>Current/Magnetic field strength DC bias</b>: When we are working with a DC bias in our current, this is reflected as a starting point different from the zero B field in the BH loop, which deforms the loop, and therefore its slope.</li>
                            <li>
                                <b>Frequency</b>: This effect happens mainly in iron powder cores, where the permeability decreases slightly as the frequency of the magnetic field grows.
                            </li>
                        </ul>
                        <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/12/image10.webp" alt="Error or each model versus cross sectional area by gap length" width="600" heigth="auto"></p>
                        <p class="text-center">
                            BH loop with a DC bias, courtesy of <a href="https://mag-net.princeton.edu"> MagNet </a>
                        </p>
                        <p>
                            About how to model these different dependencies into our permeability, and therefore our inductance (and core losses) we will talk about it in a further Musing, as it is a long subject, with different equations and models depending on the material composition.
                        </p>
                        <p>
                            Now that we know how the base permeability of a material changes with the point of operation, let see how many permeabilities do we have.
                        </p>
                        <p>
                            The answer to those questions we left unanswered  is yes, each one of those points is a different permeability, and some of them have special names and uses. Before listing them, I must clarify that all the following terms are relative permeabilities, even if it is not explicitly said. Let’s review them:
                        </p>
                        <h3 class="h3 mt-3">Initial permeability</h3>
                        <p>
                            The logical point is to start stories at the beginning, and if the BH loop were a story it would start at its center, with H and B field to zero, in a demagnetized state.
                        </p>
                        <p>
                            The moment we start applying a magnetic field to the core, it starts magnetizing following a path that will never repeat itself, as the core won’t reach this demagnetized state during its operation due to hysteresis.
                        </p>
                        <p>
                            This unique path is called “Normal Magnetization”, and it's really important in iron powder cores, where it is equivalent to the BH loop, as their coercive force is almost 0 due to its low permeability.
                        </p>
                        <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/12/image9.webp" alt="Error or each model versus cross sectional area by gap length" width="600" heigth="auto"></p>

                        <p>
                            Detail of the BH loop of a Magnetics Iron powder material, as described in their <a href="https://www.mag-inc.com/Media/Magnetics/File-Library/Product%20Literature/General%20Information/Powder-Core-BH-Loops.pdf">white paper</a>
                        </p>
                        <p>
                            It might look like I am digressing, but don’t worry, I needed to explain this curve, as the initial permeability is the slope of its beginning. It is basically the relationship between the B and H field when the material begins its magnetization.
                        </p>
                        <p>
                            And, being a permeability value that is only used once, is it important? Actually yes, it is the value provided by all manufacturers (sometimes as the AL value), as it is used to calculate the reluctance of the core in the magnetic circuit explained in other Alf’s Musings, as it is a really simple value to measure with an Impedance Analyzer. 
                        </p>
                        <p>
                            Now you might be thinking: Is this the wisest permeability to be used to model your magnetic component? Probably not, but its inaccuracy is minimized by the air gap's much higher reluctance.
                        </p>
                        <p>
                            Well, dear reader, this Alf’s Musing is already quite long, so I will stop here for the day. Just a like cliffhanger for the next Alf’s Musing, this is the list of permeabilities that are left to talk about:
                        </p>
                        <ul>
                            <li>Amplitude permeability</li>
                            <li>Incremental permeability</li>
                            <li>Complex permeability</li>
                            <li>Effective permeability</li>
                            <li>Maximum permeability</li>
                            <li>Reversible permeability</li>
                        </ul>
                        <p>
                            Until then!

                        </p>
                    </div>
                </div>
            </div>
        </div>
    </main>
    <Footer />
</template>

