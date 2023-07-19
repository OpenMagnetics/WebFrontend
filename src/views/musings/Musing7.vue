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
                    <h1 class="text-white">Alf’s Musings #7</h1>
                    <div class="user d-flex align-items-start justify-content-between bg-secondary p-4 rounded">
                        <div class="d-flex align-items-start">
                            <div class="d-block">
                                <span class="d-block text-white">by <a class="h6">Alfonso Martínez</a></span>
                                <span class="d-block text-muted">28th Nov 2022</span>
                            </div>
                        </div>
                    </div>
                    <!--//blog section-->
                    <div class="blog-section text-white">
                        <p>
                        When Power Engineers talk about designing their own Magnetics there is always a point in which we all agree to disagree: the core shapes. It’s like the drinks, everybody has a favorite, which they usually go with, and it kind of works for them. I have met people that always go with RMs, people that prefer Es, as they are cheaper, and even people that made their whole career with ETDs. But, how much of a Scientific base is behind those decisions and how much is just taste?
                        </p>
                        <p>
                        This Alf’s Musing is dedicated to the core shapes, those little pieces that make every magnetic component, and that we tend to neglect the time and thought they require.
                        </p>
                        <p>

                        I would like to start with the basic parameters of a shape
                        </p>
                        <h2 class="h2">Shape parameters</h2>
                        
                        <h3 class="h3">Effective parameters</h3>
                        
                        <p>
                        The effective parameters of a shape, length, area, and volume; are the dimensional values as seen by the magnetic flux as it traverses our shape. They can be also seen as the parameters of the toroid equivalent to our shape.
                        </p>
                        <p>
                        We must always have in mind that, although they have dimensional units, they are not geometrical parameters. The effective parameters are related to the magnetic flux in our core, and should only be used for calculation where the magnetic flux is involved.
                        </p>
                        <p>
                        The calculation of these parameters is defined in the standard IEC 60205, although they can be found along with the main dimensions in the IEC 62317, associated with each shape in the standard.
                        </p>
                        <p>
                        Their calculation is not direct, involving several steps:
                        </p>


                        <ol>
                            <li>
                            Dividing the core in small simple pieces, normally cylinders or cubes, in order to facilitate the following steps. Usually they are 5: 
                                <ul>
                                    <li>
                                        Winding column (usually the central one).
                                    </li>
                                    <li>
                                        Lateral column.
                                    </li>
                                    <li>
                                        Top/bottom plates (they are considered equal and counted as one).
                                    </li>
                                    <li>
                                        Corner connecting top/bottom plate to the winding column.
                                    </li>
                                    <li>
                                        Corner connecting top/bottom plate to the lateral column.
                                    </li>
                                </ul>

                            </li>
                            <img src="/images/musings/7/image1.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="areas and length of magnetic core RM" width="800" height="auto">
                            <p class="text-center">Areas and length for an RM</p>

                            <li>
                            For each of these simple pieces, we calculate the length of the path of magnetic flux going through it, and the area of the section perpendicular to that path. E.g.: In the central column of an ETD, with a cylindrical shape, the length would be the cylinder height and the area that of its round base.
                            </li>
                            <li>
                            We calculate two intermediate parameters, called core constants C1 and C2, as the sum of the division of each length by its area, and each length by its area squared.
                            </li>
                            <img src="/images/musings/7/image2.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="core coefficients calculation" width="250" height="auto">
                            <li>
                            We calculate our effective parameters from this core constants like this:
                            </li>
                            <img src="/images/musings/7/image3.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="effective parameters calculationfor magnetic cores" width="600" height="auto">
                        </ol>
                        <p>
                        Now we can finally use our effective parameters. But, do we know how? Let’s see
                        </p>

                        
                        <h3 class="h3">Effective length</h3>
                        <p>
                        Let’s start with the simplest one, the effective length. As explained before, this is the mean length of the path traversed by the magnetic flux inside our core. 
                        </p>
                        <p>
                        <b>When to use it:</b> In the calculation of the Reluctance value of our core if it were ungapped (which is physically impossible for the cores made of two pieces, as there is always a residual gap, but we will talk about this in another occasion). In non-ideal cases it will always go in series with the Reluctance of the gap(s)
                        </p>
                        <p>

                        <b>When NOT to use it:</b> In any calculation where geometrical length is expected, like in the Leakage Inductance or the Winding Losses.
                        </p>

                        <h3 class="h3">Effective area</h3>
                        <p>
                        The effective area is the area of the mean section that the magnetic flux sees as it travels through our core. 
                        </p>
                        <p>

                        <b>When to use it:</b> As the effective length, the effective area is used in the calculation of the Reluctance of the ungapped core. Additionally, it is the relationship between the magnetic flux and the magnetic flux density, as the former does not distribute evenly along its path.
                        </p>
                        <p>

                        <b>When NOT to use it:</b> In any calculation where a geometrical area is expected. The most common misuse of this parameter is in the calculation of the Reluctance of the gap, being used instead of the geometrical cross-sectional area of the column where the gap is. Another common misconception is to use the effective area for the calculation of the saturation magnetic flux density, which is wrong as it will be explained in the section for the minimum area.
                        </p>

                        <img src="/images/musings/7/image4.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="Geometrical diamensions of a square gap" width="500" height="auto">
                        <p class="text-center">The geometrical dimensions must be used in the calculation of the gap reluctance</p>

                        <h3 class="h3">Effective volume</h3>
                        <p>
                        The effective volume is the product of the effective area by the effective length, and it can be interpreted as the volume “filled” with magnetic flux.
                        </p>
                        <p>

                        <b>When to use it:</b> Probably the most common use of this parameter is the calculation of the total losses from the volumetric losses, given by material loss estimation models (Steinmetz, Roshen, iGSE)
                        </p>
                        <p>
                        <img src="/images/musings/7/image5.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="core losses from volumetric core losses" width="300" height="auto">

                        <b>When NOT to use it:</b> In any calculation where a geometrical volume is expected. It must not be confused with the real volume, or with the volume of the cube containing our core, and most definitely must not be used to calculate the total weight from the ferrite density. The intuitive reason for this is that there is volume of our core where none or little of the magnetic flux circulates (e.g.: the exterior corners of an E shape), but still has material and weight.
                        </p>

                        <h2 class="h2">Important geometrical parameters</h2>
                        
                        <p>
                        There are a few other parameters in our magnetic core that deserve to be mentioned in this guide, as they can really affect a design. The parameters in this section also affect the calculation of the magnetic behavior, though they are geometrical.
                        </p>


                        <h3 class="h3">Minimum area</h3>
                        
                        <p>
                        The minimum area, as it name says, is the minimum cross sectional area traversed by the magnetic flux. It is used to calculate the saturation magnetic flux density, and not the effective area, as it is through this minimum area where the saturation of our core will begin, equivalent to a bottleneck.
                        </p>

                        <h3 class="h3">Gap perimeter</h3>
                        
                        <p>
                        The gap perimeter is the perimeter of the area of the core where our gap is placed. It is used in the calculation of the Reluctance of the gap if we want to take into account the effect of the fringing field, although many formulas directly use the area enclosed by this perimeter.
                        </p>
                        <p>
                        The reason why the perimeter must be used, is that this fringing effect is produced along the fringe of the gap, and the longer this distance, the larger the effect.
                        </p>
                        <p>
                        Using methods that use the area instead of the perimeter is fine as long as the shape of the gap is square or round, because the models were developed for those, but this is not true for some shapes like the EPX or the lateral legs of complex shapes, like PQ or RM.
                        </p>

                        <h3 class="h3">Lateral leg area/perimeter</h3>
                        
                        <p>
                        And now that we have mentioned the lateral legs, I would like to highlight a common misconception when gapping all three legs: Many designers assume that the Reluctance of a lateral leg is the double of the Reluctance of the central leg, which is true for simple shapes like Es or Us.
                        </p>
                        <p>
                        If we are working with complex shapes, like PQ, P, PM or RM, we must consider that the perimeter of these legs are much longer than the perimeter of the central round leg, and their Reluctance, with or without considering Fringing Effect, is going to be very different of the double of the central one.
                        </p>
                        <p>
                        This effect is especially large in the case of P and PM shapes with gaps in the three legs, leading to a worst-case error of near 50% in the inductance calculation.
                        </p>

                        <img src="/images/musings/7/image6.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="Different gap areas in a PM magnetic core" width="500" height="auto">
                        <p class="text-center">Lateral gap area and perimeter (purple) much larger than central ones (green)</p>

                        <h3 class="h3">Winding window area/shape</h3>
                        
                        <p>
                        This area is the one between the winding column, the lateral column, and the top and bottom plates. It is the part of the core where we place the turns of our inductor/transformer. 
                        </p>
                        <p>
                        Some people might argue that this space does not have any effect on the magnetic core that is not defined by the aforementioned parameters, but I might argue back that it constrains one of the most important parameters of our magnetic component: the Current density.
                        </p>
                        <p>
                        For example, all the energy of our inductor, including the part that we are transforming and storing as magnetic flux, has to go through the winding window, and twice that energy (once as input and once as output) in the case of a transformer.
                        </p>
                        <p>
                        And because we don’t want to burn our wires, we have to control the current density through our winding window (and the heat that it produces) to be balanced with the heat dissipation of our system. This dependency contradicts the extended belief that we can have smaller magnetics at higher frequencies. But this is a topic for another time.
                        </p>
                        <p>

                        I wanted to talk a bit about the origin of the shape names and about the non technical reasons for choosing cores, such as availability and price, but I will have to leave for next chapter.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </main>
    <Footer />
</template>

