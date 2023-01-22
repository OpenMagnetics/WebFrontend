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
                    <h1 class="text-white">Alf’s Musings #11</h1>
                    <div class="user d-flex align-items-start justify-content-between bg-secondary p-4 rounded">
                        <div class="d-flex align-items-start">
                            <div class="d-block">
                                <span class="d-block text-white">by <a class="p">Alfonso Martínez</a></span>
                                <span class="d-block text-muted">5th Jan 2023</span>
                            </div>
                        </div>
                    </div>
                    <div class="blog-section text-white">
                        <h2 class="h2 mt-3">Alf’s errata</h2>
                        <p>
                            I would like to start this number expressing my gratitude to André Giovani Leal Furlan, who passed me his implementation of Balakrishnan’s model for reluctance, and added one more theory to this collection of articles, and another point of view to the air gap problem.
                        </p>
                        <p>
                            Additionally, I would also like to correct one errata in my previous article, where I said that one of the models I had in my comparison was McLyman’s. That is not true, the model was developed by Partridge in 1936, though it was McLyman, through his book “Transformer and inductor design handbook”, who propagated its use.
                        </p>
                        <p>
                            With the aforementioned addition to the error study, and the proper name of the model corrected, the updated graph is:
                        </p>
                        <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/11/image18.webp" alt="Error or each model versus cross sectional area by gap length" width="800" heigth="auto"></p>

                        <p>
                            And before getting into the main topic of this chapter, I would like to make a visual summary of all the dependencies of the magnetizing inductance, as I discussed in the previous chapters. Not every model takes all these variables into account, and for certain core materials some dependencies can be totally neglected without incurring much error, but the full tree is something that must be in the head of each Power Electronics Engineer, if only to know what you are ignoring.
                        </p>
                        <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/11/image14.webp" alt="Inductance dependencies variables mindmap" width="800" heigth="auto"></p>

                        <p>
                            I know it might look complex or even worse, unnecessarily complex! At the end of the story we are trying to design devices that shape and direct one of the fundamental forces, using the few elements that are naturally ferromagnetic, in the exact small range of composition that make them interact in a way that their magnetic permeability is high enough for our purpose.
                        </p>
                        <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/11/image16.webp" alt="Magnetism of periodic table elements" width="800" heigth="auto"></p>
                        <p>
                            And then we try to design such a complex system with simple equations and complain when we have to use a model that includes anything more complex than a logarithm. So, disclaimer for you, dear reader, this is just my opinion, but if we want to design electromagnetic components, we need to accept the complexity of the system and try to use the best tools in order to do our job. Because no good Engineer uses the wrong tool consciously. 
                        </p>

                        <h2 class="h2">Stenglein‘s model</h2>
                       
                        <p>
                            The second model I will analyze is the one written by Erika Stenglein in her paper “The Reluctance of Large Air Gaps in Ferrite Cores”
                        </p>
                        <h3 class="h3">Erika Stenglein’s bio</h3>
                        <p>
                            Erika Stenglein received the master’s degree in electrical engineering from the Friedrich-Alexander University of Erlangen-Nürnberg (FAU), Erlangen, Germany, in 2015, where she pursued the Dr.-Ing. degree in electrical engineering with the Department of Electromagnetic Fields. She then joined the Department of Electromagnetic Fields, Faculty of Engineering, FAU, as a Teaching and Research Assistant. She is currently working as a System Engineer in the Siemens EMC Center Erlangen.
                        </p>
                        <h3 class="h3">Review of the method</h3>
                        <p>
                            Most of the models existing in the literature are on the assumption that the length of the gap is small compared to the length of the magnetic circuit or the column where they are placed. Stenglein presents a model that aims to cover the other case, large air gaps.
                        </p>

                        <div class="container p-0">
                            <div class="row">
                                <div class="col-8">
                                    <p>
                                        Stenglein starts her work presenting a comparison for a core with round central column (as the P family) between the exact solution for a 2-dimensional H field presented by Albach and Roßmanith in “The influence of air gap size and winding position on the proximity losses in high frequency transformers” against the simple Partridge’s model presented in McLyman’s book; showing that there is an inflection point in the inductance that the simple model cannot predict.
                                    </p>
                                    <p>
                                        The rationale behind the author’s work is that the exact solution is quite costly to use in common cases, so she proposes a simplified version that is able to replicate the same behavior as the complete solution with acceptable error.
                                    </p>
                                </div>
                                <div class="col-4">
                                    <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/11/image7.webp" alt="Inductance for Stenglein and Albach model for a Magnetic Core P" width="500" heigth="auto"></p>
                                </div>
                            </div>
                        </div>
                        <p>
                            In order to do that, she calculates the inductance and fringing factor that there would be if the gap were as big as the winding column, meaning that we completely remove the column. Additionally she assumes a homogeneous current density circulating through the N turns of the magnetic, and a completely full winding window:
                        </p>


                        <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/11/image20.webp" alt="Current density model Stenglein" width="500" heigth="auto"></p>

                        <p>
                            Where b is the internal radius of the winding window, c is the external radius, and l1 is the height. She basically divides the Ampere-turns by the area of the winding window. She also assumes the relative permeability of the material is infinite, so the magnetic field inside the core is negligible compared to the one in the air.
                        </p>
                        <p>
                            Using the above equation into Oersted’s Law, she arrives at:
                        </p>
                        <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/11/image19.webp" alt="H field model Stenglein" width="500" heigth="auto"></p>

                        <p>
                            And then substitutes this calculated H field into the equation of the magnetic energy for an inductor:
                        </p>
                        <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/11/image10.webp" alt="Magnetic Energy model Stenglein" width="300" heigth="auto"></p>
                        <p>
                            Solving for L and dividing it by the cross sectional area of the central column she achieves the following formula for an inductor with the central column completely removed:
                        </p>
                        <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/11/image8.webp" alt="Fringing factor for a P core without central column model Stenglein" width="400" heigth="auto"></p>
                        <p>
                            After analyzing how the position of the gap affects its fringing factor, the authors presents a formula for this factor when the gap is vertically centered in the column, which is based on the formula presented by McLyman in his books, but with some modifications to take into account the effect of large gaps:
                        </p>
                        <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/11/image17.webp" alt="Air gap reluctance equation model Stenglein" width="800" heigth="auto"></p>

                        <p>
                            This equation might look intimidating, so let’s analyze a bit. It is a composition of two formulas. If we were to call term M (as McLyman) to 
                        </p>
                        <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/11/image13.webp" alt="McLyman/Partridge reluctance Equation model Stenglein" width="300" heigth="auto"></p>

                        <p>
                            And term S (as Stenglein) to
                        </p>
                        <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/11/image9.webp" alt="Stenglein term" width="300" heigth="auto"></p>
                        <p>
                            And finally term L to 
                        </p>
                        <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/11/image15.webp" alt="gap length scaling term" width="100" heigth="auto"></p>

                        <p>
                            The above frightening equation transforms into:
                        </p>
                        <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/11/image1.webp" alt="simple  Stenglein equation" width="500" heigth="auto"></p>

                        <p>
                            Which shows us that what Stenglein really proposes is to use the method from McLyman’s book (Partridge model) when the length of the gap is small ( L ≃ 0 ) and her formula when the whole central column is missing and all is gap ( L ≃ 1 ). In between she approximates with the power factor we defined as L.
                        </p>
                        <p>
                            But this gap is valid for when it is centered in the winding window, what happens when it is placed at a different height? Well, the author presents some polynomial function to calculate it, calibrated with numerical constants extracted from the exact solution, but much faster to calculate.
                        </p>

                        <div class="container m-0 p-0">
                            <div class="row">
                                <div class="col-8">
                                    <div class="container m-0 p-0">
                                        <div class="row">
                                            <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/11/image11.webp" alt="model Stenglein corrections for different gap height 1" width="500" heigth="auto"></p>
                                        </div>
                                        <div class="row">
                                            <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/11/image5.webp" alt="model Stenglein corrections for different gap height 2" width="500" heigth="auto"></p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-4">
                                    <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/11/image6.webp" alt="model Stenglein corrections for different gap height 3" width="500" heigth="auto"></p>
                                </div>
                            </div>
                        </div>

                        <p>
                            Lastly, the author concludes with some modification for columns with a drill in the central column, and a study, through Finite Element solution, of the effect that having a rectangular column might have in the accuracy of the model, concluding that the error of applying the same model to round and rectangular columns is negligible for large gaps.
                        </p>
                        <p>

                            We can see that it is not the most elegant solution, as personally I am not a big fan of magic numbers, but what is really important here is how this model fares against reality.
                        </p>
                            
                        <h3 class="h3">Verification</h3>
                        <p>
                            In this section I would like to see how this model fared in comparison with the classical method and the average of all the models.
                        </p>
                        <p>

                            As the previous author, Stenglein also has different formulas for round and rectangular columns, and again I have splitted the results in those two sections.
                        </p>
                        <p>

                            Let’s start with the round columns, as it’s this author's main focus. We can observe how this model keeps the error under the average of the rest, even for large air gaps, which is really its strong point.
                        </p>

                        <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/11/image12.webp" alt="Error for Stenglein model for round columns" width="800" heigth="auto"></p>

                        <p>
                            If we take a look at rectangular cores, we can see how it behaves worse than the average, even if the author assures us that the error is negligible, but just slightly worse, which still is a really good result.
                        </p>
                        <p><img  class="img-fluid bounce-little my-3 mx-auto d-block" src="/images/musings/11/image4.webp" alt="Error for Stenglein model for square columns" width="800" heigth="auto"></p>
                        <p>
                            As happened with the previous, this difference is easily explained in the structure of the paper, where Stenglein focuses her work on cores with round columns and radial symmetry, although the expansion she does for rectangular columns is more detailed than other authors.
                        </p>
                        <p>

                            In general, I would recommend this paper not only for what it is intended for, large gaps, but in general gaps in round columns, where it has, if not the best behavior, a really decent one.
                        </p>
                        <p>

                            My only remark would be a call to the author, if she reads this, to try and improve the general accuracy by using as a base a better model than Partridge’s, as the general idea of the paper is improving the behavior for large gaps of an existing model.
                        </p>

                        <h3>
                            Code
                        </h3>
                        <p>
                            The implementation of this model was done in C++, and follows the structure defined in the Magnetic Agnostic Structure format, which incorporates a proper definition of the gap, including all the variables used in the model calculation.
                        </p>
                        <p>
                            The code is too cumbersome to be included directly in this article, but it can also be found in Github in <a href="https://github.com/OpenMagnetics/MKF/blob/main/src/Reluctance.cpp">https://github.com/OpenMagnetics/MKF/blob/main/src/Reluctance.cpp</a>
                        </p>
                        <p>
                            The validation tests, along the data used for verification is in <a href="https://github.com/OpenMagnetics/MKF/blob/main/tests/TestReluctance.cpp">https://github.com/OpenMagnetics/MKF/blob/main/tests/TestReluctance.cpp</a>
                        </p>
                        <p>
                            If you, dear reader transformed into a programmer, have any usage or implementation doubt, don't hesitate to contact me, and I would gladly help.
                        </p>


                    </div>
                </div>
            </div>
        </div>
    </main>
    <Footer />
</template>

