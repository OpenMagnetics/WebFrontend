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
                    <h1 class="text-white">Alf’s Musings #10</h1>
                    <div class="user d-flex align-items-start justify-content-between bg-secondary p-4 rounded">
                        <div class="d-flex align-items-start">
                            <div class="d-block">
                                <span class="d-block text-white">by <a class="p">Alfonso Martínez</a></span>
                                <span class="d-block text-muted">3th Jan 2023</span>
                            </div>
                        </div>
                    </div>
                    <div class="blog-section text-white">

                        <h2 class=mt-3>A bit of context</h2>
                        <p><span>I have talked about the importance of correctly predicting the behavior of your magnetic component. If you, dear Engineer reader, don't fully model your design, you are just passing part of your responsibility to the manufacturer's Engineer, and forcing                 your employer to pass part of your next salary raise to that other Engineer's employer.</span></p>
                        <p><span>In this chapter of Alf's Musings we are going to further focus on the magnetizing inductance, concretely               on how the air gap(s) affects it through their reluctance.</span></p>
                        <p><span>In an ideal world, when the magnetic flux lines traversing a high permeability magnetic core find themselves               changing to a low permeability medium, like the air, they just continue perfectly straight, as if nothing had changed. </span></p>
                        <p><span>But because we don't live in such a world, the lines expand and separate from each other, bulging towards the exterior, until they reach the other side of the gap and they join ranks again inside the magnetic core. This effect is called Magnetic Fringing Effect and this deformed flux, Magnetic Fringing Flux. And like most things in life, it can be good and bad. Let's see how we               can take advantage of it.</span></p>
                    
                        <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/10/image18.webp" alt="2D fringing flux simulation by Encyclopedia Magnetica" width="500" heigth="auto"></p>
                    
                        <p class="text-center fs-6"><span>2D Fringing Flux Simulation, taken from Encyclopedia Magnetica https://e-magnetica.pl/flux_fringing</span></p>
                        <p><span>The positive thing about the Fringing Flux is that it increases the volume of air that stores energy in our magnetic component, increasing also the inductance; which is good only if we are able to predict how much,              and reduce the gap length accordingly in order to achieve the values we want.</span></p>
                        <p><span>This effect is nothing new, known since the first half of the 20th century. In these years there have been                 several authors that have attempted to model this effect and predict how much of an increase the inductance will have.</span></p>
                                        <p><span>The models covered in this study are:</span></p>
                                        <ul>
                                            <li><span>Mühlethaler</span></li>
                                            <li><span>Stenglein</span></li>
                                            <li><span>McLyman</span></li>
                                            <li><span>Effective Area</span></li>
                                            <li><span>Zhang</span></li>
                                            <li><span>Classical (ignoring Fringing Effect)</span></li>
                                        </ul>
                        <p><span>Because no model is any good without verification, I am running each of these models against a battery of tests taken from the verification section of many papers and design procedures, in order to compare them under the same conditions.</span></p>
                        <p><span>And because I believe in Open Source, the implementation code of each of these models will be provided along with its review.</span></p>
                        <p><span>Before I got into the first model I wanted to give a quick overview of the results obtained by each model, although a deeper analysis will be done for each individual model.</span></p>
                        <p><span>For this simple analysis I wanted to show how the error behaves against an increase of the relationship between Cross Sectional Area and Gap Length. I chose this operation because it is the one assumption made by many models in order to be accurate: Ag &gt;&gt; lg.
                        </span></p>
                        <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/10/image17.webp" alt="Error or each model versus cross sectional area by gap length" width="800" heigth="auto"></p>
                    
                        <p><span>To ease the view, the linear tendency has been drawn, and, although it is crude simplification, we can observe how all models improve the classical method of ignoring Fringing Flux; and how the error grows as the Ag / lg grows, which means that the models are less accurate for large gaps. But, as I said, the validation will be studied in more detail in further sections.</span></p>
                                        <h2><span>Mühlethaler &lsquo;s model</span></h2>
                        <p><span>The first of these models will be the one written by Jonas Mühlethaler in his paper &ldquo;A Novel Approach for 3D Air Gap Reluctance Calculations&rdquo;</span></p>
                                        <h3><span>Jonas Mühlethaler's bio</span></h3>
                        <p><span>Jonas Mühlethaler completed his studies at ETH Zurich with a PhD degree in electrical engineering with a specialization in power electronics. He then co-founded the ETH spinoff &ldquo;Gecko Simulations&rdquo;. After his entrepreneurial activities, he became active in the Swiss electricity industry, first as a consultant at AWK Group and then as R&amp;D Manager at Swissgrid. In the role of the R&amp;D Manager, he oversaw the company-wide R&amp;D portfolio as well as various R&amp;D projects. </span></p>
                        <p><span>He joined the Institute of Electrical Engineering at the Lucerne University of Applied Sciences (HSLU) as a Lecturer in August 2020.</span></p>
                                        <h3><span>Review of the method</span></h3>
                        <p><span>In his paper, Mühlethaler explains how up to his knowledge there is no approach for the calculation of the Gap Reluctance that is able to take into account the three dimensionality of the core, it is simple enough to use, and includes any shape of the gap; while keeping a good accuracy. Let's review how his approach tries to cover all those points.</span></p>
                        <div class="container p-0">
                            <div class="row">
                                <div class="col-8">
                                    <p><span>His method starts by  defining a basic 2D reluctance, as was defined in &ldquo;Air-Gap Reluctance and Inductance Calculations for Magnetic Circuits Using a Schwarz&ndash;Christoffel Transformation&rdquo; by A. Balakrishnan, using the Schwarz-Christoffel transformation, which consists of an analogy that relates the calculation of the reluctance of a gap to the calculation of its capacitance. The author includes the full derivation of this basic 2D reluctance in an appendix.</span></p>
                                    <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/10/image1.webp" width="500" heigth="auto" alt="Basic reluctance building block Muehlerthaler model" ></p>
                                    <p><span>Once he has obtained this basic 2D reluctance, the author uses it as a building block to construct all the different variations of a 2D gap, which are column to column, column to corner of plate, and column to plate. Figure 1, to the right, extracted from the paper, shows the 3 different configurations.</span></p>
                                    <p><span>Each one of this cases is defined as a simple circuit, defined in Figure 2, formed by the basic 2D reluctance defined before, and explains how to relate the model parameters to the dimensions of our magnetic core, where a and b are defined in Figure 1, and l and w are the length of the gap and the width of the column where the gap is, respectively. The solution of this simple circuit gives us the 2D reluctance of our gap.</span></p>
                                </div>
                                <div class="col-4">
                                    <p><img  class="img-fluid bounce-little mb-3 mx-auto d-block" src="/images/musings/10/image14.webp" alt="Schema about how to model each gap Muehlerthaler model" width="210" heigth="auto"></p>
                                </div>
                            </div>
                        </div>
                        <p><span>But the strong point of this method is that the author extrapolates this 2D reluctance to the 3D case. In order to achieve that he separates the case of rectangular and cylindrical columns.</span></p>
                        <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/10/image16.webp" alt="Equivalent core gaps built with basic reluctances Muehlerthaler model" width="800" heigth="auto"></p>
                        <p class="text-center"><span>Circuits used to calculate the 2D reluctance</span></p>
                        <p><span>For rectangular columns, he calculates the Fringing Factor, the relationship between how much the flux is deformed while traversing the gap compared to the ideal case, for each of the two dimensions assuming that the other dimension is infinite. This is done by dividing the 2D reluctance calculated above with the simple circuit by the reluctance that the gap would have if there were no fringing effect, calculated by the classical formula:</span></p>

                        <p><img alt="Classical reluctance equation" class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/10/image2.webp" width="300" heigth="auto"></p>

                        <p><span>which gives a fringing factor per unit of length σ for a given dimension (x or y) of:</span></p>

                        <p><img alt="one dimensional fringing factor square column equation Muehlerthaler model" class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/10/image4.webp" width="300" heigth="auto"></p>

                        <p><span>where <i>l</i>  is the length of the gap, <i>w<sub>x/y</sub></i> is the width of the column in either x or y dimension, and ℜ' is the 2D reluctance for our column.</span></p>
                        <p><span>Finally, once the author has both reluctances, σ<sub>x</sub> and σ<sub>y</sub> he uses both to calculate the final air gap reluctance taking into account both column dimensions:</span></p>

                        <p><img alt="two dimensional reluctance square column equation Muehlerthaler model" class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/10/image10.webp" width="500" heigth="auto"></p>

                        <p><span>For the case of round columns, the paper adapts the aforementioned formulas, where r is the radius of the column:</span></p>

                        <p><img alt="one dimensional fringing factor round column equation Muehlerthaler model" class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/10/image11.webp" width="200" heigth="auto"></p>


                        <p><img alt="two dimensional reluctance round column equation Muehlerthaler model" class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/10/image12.webp" width="500" heigth="auto"></p>

                        <p><span>Finally, the paper ends with a brief calculation of the reluctance of the core, noticing how it is really important to take into consideration the variability of the core permeability; and a comparison against experimental results, that has been added to the pool of measurements use in the study of all the models</span></p>

                        <h3><span>Verification</span></h3>
                        <p><span>In this section I would like to see how this model fared in comparison with the classical method and the average of all the models.</span></p>
                        <p><span>As the author has different formulas for round and rectangular columns, I have splitted the results in those two sections.</span></p>
                        <p><span>If we focus our attention to rectangular columns, we can see that this model performs better in general than the average, and much better than the classical model.</span></p>
                        <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/10/image13.webp" alt="Error for Muehlerthaler model for square columns" width="800" heigth="auto"></p>
                        <p><span>However, if we take a look at the result for round columns, we observe how the model performs worse than the average, especially for large gaps.</span></p>
                        <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/10/image15.webp" alt="Error for Muehlerthaler model for round columns" width="800" heigth="auto"></p>
                        <p><span>This difference in behavior makes sense if we look at how the paper is structured, as its development looks focused on rectangular columns, being the longest and better explained part, while round columns look more like an addendum in order to generalize.</span></p>
                        <p><span>As a summary, I would recommend using this model for small or rectangular gaps, where its accuracy is much better than the average.</span></p>

                        <h3><span>Code</span></h3>
                        <p><span>The implementation of this model was done in C++, and follows the structure defined in the Magnetic Agnostic Structure format, which incorporates a proper definition of the gap, including all the variables used in the model calculation.</span></p>
                        <p><span>The code is too cumbersome to be included directly in this article, but it can also be found in Github in <a href="https://github.com/OpenMagnetics/MKF/blob/main/src/Reluctance.cpp">https://github.com/OpenMagnetics/MKF/blob/main/src/Reluctance.cpp</a></span></p>
                        <p><span>The validation tests, along the data used for verification is in <a href="https://github.com/OpenMagnetics/MKF/blob/main/tests/TestReluctance.cpp">https://github.com/OpenMagnetics/MKF/blob/main/tests/TestReluctance.cpp</a></span> </p>
                        <p><span>If you, dear reader transformed into a programmer, have any usage or implementation doubt, don't hesitate to contact me, and I would gladly help.</span></p>


                    </div>
                </div>
            </div>
        </div>
    </main>
    <Footer />
</template>

