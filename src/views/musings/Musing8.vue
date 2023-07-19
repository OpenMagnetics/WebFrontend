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
                    <h1 class="text-white">Alf’s Musings #8</h1>
                    <div class="user d-flex align-items-start justify-content-between bg-secondary p-4 rounded">
                        <div class="d-flex align-items-start">
                            <div class="d-block">
                                <span class="d-block text-white">by <a class="h6">Alfonso Martínez</a></span>
                                <span class="d-block text-muted">4th Dec 2022</span>
                            </div>
                        </div>
                    </div>
                    <!--//blog section-->
                    <div class="blog-section text-white">
                        <h2 class="h2">The Etymology of the Shapes</h2>
                        <p>
                        There are few social studies that I enjoy more than Etymology. I always felt that learning why a word is written in a certain way can give us a dimension about the understanding of the things described by that word that cannot be reached by any other means, even if it is something we are experts on. And this is even more obvious for acronyms, which is the case we are discussing today.
                        </p>
                        <p>
                        So, yes, most family names are acronyms of words that used to describe these cores. I said most, because for the most simple ones it is not true. But let’s go case per case:
                        </p>

                        <ul>                                
                            <li>
                                I, C, U, E: These families don’t have further mystery than that they have the same shape as the letter that describes them, and it’s why sometimes the core sets are named with two of them: EE, EI, UI, UU, etc.
                            </li>
                            <li>
                                DS: Double Slab.
                            </li>
                            <li>
                                ETD: Economic Transformer Design.
                            </li>
                            <li>
                                EFD: Economic Flat Transformer Design.
                            </li>
                            <li>
                                ELP: E Low Profile.
                            </li>
                            <li>
                                EP: Mix between E and a Pot core.
                            </li>
                            <li>
                                ER: It is an E with a Round central column.
                            </li>
                            <li>
                                UR: It is an U with one or two Round columns.
                            </li>
                            <li>
                                P: Pot cores (I guess they have the shape of a pot).
                            </li>
                            <li>
                                PS: This is how P core halves are called, and it is an acronym of Proximity Switches, where they are commonly used.
                            </li>
                            <li>
                                PM: Power Module.
                            </li>
                            <li>
                                PQ: This one took me hours of researching through the internet. I am leaving it for the next to the last page, in case some of you are excited by solving the mystery by yourselves.
                            </li>
                            <li>
                                RM: Rectangular Modular.
                            </li>
                            <li>
                                T: Surprisingly it is for Toroid.
                            </li>
                        </ul>
                        <p>
                        In general, cores with a round column have less winding losses, as any turn around their center column is approximately 11% shorter. But the square ones have the extra advantage that they can be stacked, so the total area for the magnetic flux density can be increased easily, while giving the option of controlling the eddy currents (yes, ferrite has a large resistivity, but not infinite. Sorry for those firm believers of Steinmetz loss curves).
                        </p>
                        <h2 class="h2">The economy of the Shapes</h2>
                        
                        <p>
                        I was taught at my University that Engineering is the art of solving a problem with limited resources. I thought it was true then, but now, especially in the last few years, with all the supply problems around the world in the Electronics sector, I think it is even truer.
                        </p>
                        <p>
                        When we design a magnetic component we have to think in Electromagnetic Field, in Losses and Efficiency, in Heat Dissipation and Mechanical constraints; and sometimes we tend to forget until the last moment that our product will go into production and there is something called Economy that affects it from the beginning.
                        </p>
                        <p>

                        Following this reasoning, I wanted to do an article not so much focused on Electromagnetism, but on how other parameters, stock and price in this case, affect our designs, and how we can take it into account from the very beginning, the selection of the core. I won’t claim the text in this article is the most unputdownable one I have ever written, but I always found this kind of data analysis interesting, as it makes us look at things in a different light.
                        </p>
                        <p>

                        Let’s get into real data analytics about the ferrites. Allow me to begin this section with an explanation of the data source and its processing. The following tries to be manufacturer and material agnostic, as we are talking uniquely about the shapes (though a similar study for material could be done in the future, I’m writing it down as homework).
                        </p>
                        <p>

                        Equally, there is no mention of the distributor, although several of them have been used, the prices all converted to Dollars and averaged, so any price shown here is a mean value over the prices that can be found over the internet. Finally, all data shown here is over one piece, the references that came in pairs were adjusted accordingly.
                        </p>
                        <p>

                        Yes, I know that some distributors charge more for a piece than it really costs, and I know that if you buy in volume you pay less. That's why the prices have been normalized over 1, which allows us to perceive the relative cost of a shape against another without getting picky on the exact prices.
                        </p>
                        <p>
                        <img src="/images/musings/8/image1.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="Dilbert good data" width="800" height="auto">

                        About dimensions: the field size found here is the volume of the surrounding cube that would fit the core. It is not the volume of material of the core, and it is definitely not the effective volume, as we discussed in the previous number of Alf’ Musings. As a curiosity, here you can see the surrounding cube compared against the effective volume, where it can be appreciated that they don’t grow 1 to 1. So, as an addendum to the previous rules, never use the effective volume for anything geometrical or mechanical, especially don’t use it as the volume that it will occupy in your converter.
                        </p>
                        <p>
                        <img src="/images/musings/8/image2.svg" class="img-fluid bounce-little my-3 mx-auto d-block" alt="surrounding cube volume versus effective volume" width="800" height="auto">

                        Going back to the topic at hand, the last remark about the data that will be shown is that, although the data I had available is the stock on the distributors and not the real usage, and considering we live in a capitalist world, where the manufacturers are not going to have a larger stock of pieces of one type unless they are more oftenly used; I find that assuming that the available stock is a reflection of the real usage can give some useful insight. I am also aware that this is a picture in time, and the study should be done over time, but hey, beggars can’t be choosers. If somebody has data and not just an opinion to the contrary, please provide them and I happily will include them here.
                        </p>
                        <p>

                        First I would like to analyze the usage online stock:
                        </p>
                        <h3 class="h3">Stock versus size</h3>
                        <img src="/images/musings/8/image3.svg" class="img-fluid bounce-little my-3 mx-auto d-block" alt="surrounding cube volume versus online stock" width="800" height="auto">
                        <p>There are no surprises here, at we can observe that the really small and rally large cores are seldomly used, and there is a tendency towards not using large cores (as they have more core losses due to longer eddy current)</p>

                        <h3 class="h3">Stock per family</h3>
                        <img src="/images/musings/8/image4.svg" class="img-fluid bounce-little my-3 mx-auto d-block" alt="online stock per family" width="800" height="auto">

                        <p>
                        Due to the assumption I explained at the beginning this might be controversial. Here we can see large quantities in Es, which can be explained because it is one of the simplest shapes, and therefore cheaper to manufacture; plus it comes in a lot of sizes, which also helps with the numbers.
                        </p>
                        <p>
                        Another interesting thing is the number of Planar cores, which reinforces the general idea that planar magnetics are more used every day.
                        </p>
                        <p>
                        We can see how there are many more RMs than PQs, two shapes that are quite used in modern magnetics, due to how compact they can be. Again, this can also be seen the other way around, many more people are using PQs, and that is why the stock is low.
                        </p>

                        <h3 class="h3">Price versus Size</h3>
                        <img src="/images/musings/8/image5.svg" class="img-fluid bounce-little my-3 mx-auto d-block" alt="price versus surrounding cube volume" width="800" height="auto">
                        <p>
                        Here we can appreciate how the price of a core evolves with its size. As can be seen it is not a linear relationship, as the price per unit of volume grows with the size. This can be interpreted as larger cores being more difficult to manufacture, as they need more time to sintere in their whole volume, plus their handling and transportation is more expensive, as they are more delicate than smaller, easier-to-handle shapes.
                        </p>
                        <p>
                        But there is something more we extract from this graph. If we zoom in the area between 500 and 5000 mm³:
                        </p>
                        <p>
                        <img src="/images/musings/8/image6.svg" class="img-fluid bounce-little my-3 mx-auto d-block" alt="price versus surrounding cube volume detail" width="800" height="auto">

                        We can observe a large variation also for similar sizes, as is common knowledge among Magnetic designers, there are some shapes more expensive than others. In this zoom-in I have included the name of each point, and we can observe how in general, more complex shapes, like Ps, RMs, or EQs are more expensive than simpler ones, like Es.
                        </p>
                       
                        <h3 class="h3"> Price per Size per family</h3>
                        <p>
                        If we divide the price of each piece by its size, we can aggregate the cores per family, and the result will show the relative price per size of each shape, or how the complexity of a shape affects its price:
                        </p>
                        <p>
                        <img src="/images/musings/8/image7.svg" class="img-fluid bounce-little my-3 mx-auto d-block" alt="price per surrounding cube volume per family" width="800" height="auto">

                        Interestingly enough, the most expensive family of pieces is the RM, which makes sense as its shape is the one with more complexity.It is followed by the Ps, and in thor position the Es, which, although they are quite simple to manufacture, their variety and large sizes contribute to its  average price.
                        </p>

                        <h3 class="h3">Price versus effective parameters</h3>

                        <p>
                        I have insisted a lot in not using the effective parameters for any calculation that needs a geometrical dimension, but that does not mean that we cannot analyze how they are related with our market parameters, price and stock.
                        </p>
                        <p>
                        To make the comparison we are going to use the previously defined core constants/factors C1 and C2. For those of you that want to read more about this, I recommend the book Soft Ferrites, by E.C. Snelling, where he defines them as the geometrical parameters or the reluctance and the hysteresis loss of an ideal toroid.
                        </p>
                        <p>

                        And how is this related to the economy of my design? Well, firstly it means, according to the following chart, that there is a tendency towards having more pieces in stock with higher C1 and C2, which means more pieces with larger reluctances and larger hysteresis loss.
                        </p>
                        <p>

                        <img src="/images/musings/8/image8.svg" class="img-fluid bounce-little my-3 mx-auto d-block" alt="core constants c1 and c2 versus online stock" width="800" height="auto">

                        If we look at how much C1 and C2 costs, they both decrease with price. Does this mean that more expensive pieces have less losses?  Not really, it means they have smaller hysteresis loss, but as C2 grows with the size, it also does the eddy current and excess eddy current losses, which are not negligible for large cores (more information about that in <a href="/musings/4">Alf’s Musings #4</a>).
                        </p>

                        <img src="/images/musings/8/image9.svg" class="img-fluid bounce-little my-3 mx-auto d-block" alt="core constants c1 and c2 versus price" width="800" height="auto">

                        <p>
                        And to end of this really long chapter of Alf’s Musing, is the analysis of how C1 and C2 are distributed on average along the families. Why is this important? Because for example a larger C1 will give you smaller inductances in ungapped cores, while a smaller C2 would mean smaller losses at lower frequencies, as the eddy current losses are not predominant.
                        </p>
                        <p>
                        With this in mind, we can see that the most cost efficient is the EFD family, but this is because they only come in small sizes. Also in this analysis it can be seen that the RMs and ETDs have comparatively low values, which matches the previous sections, where we saw they had one of the largest stocks, meaning they are commonly used.
                        </p>
                        <img src="/images/musings/8/image10.svg" class="img-fluid bounce-little my-3 mx-auto d-block" alt="price per core constants c1 and c2" width="800" height="auto">
                        <p>
                        And this would be all for this chapter of Alf’s Musings! I hope that the reading was not too hard (have mercy on me, analyzing data is not my forte), and that at least part of this information might be useful for you in the future. Of course, if you, dear reader, have any doubt or correction to my interpretation, or even better data, please contact me and I will add it here.
                        </p>

                        <br/> <br/> <br/> <br/> <br/> <br/> <br/> <br/> <br/> <br/> <br/> <br/> <br/> <br/> <br/> <br/> <br/> <br/> <br/> <br/> <br/> <br/> <br/> <br/> <br/> <br/> <br/> <br/> <br/> <br/> <br/> <br/> 
                        <p>PQ stands for Power and Quality. Yes, manufacturer’s marketing at its best.</p>

                    </div>
                </div>
            </div>
        </div>
    </main>
    <Footer />
</template>

