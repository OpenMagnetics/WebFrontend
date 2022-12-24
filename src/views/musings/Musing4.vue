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
                    <h1 class="text-white">Alf’s Musings #4</h1>
                    <div class="user d-flex align-items-start justify-content-between bg-secondary p-4 rounded">
                        <div class="d-flex align-items-start">
                            <div class="d-block">
                                <span class="d-block text-white">by <a class="h6">Alfonso Martínez</a></span>
                                <span class="d-block text-muted">15th Sep 2022</span>
                            </div>
                        </div>
                    </div>
                    <!--//blog section-->
                    <div class="blog-section text-white">
                        <h1 class="h2">Roshen’s Models Offer An Advanced Approach To Modeling Core Losses</h1>
                        <p>Sometimes it is easy to admire famous scientists and engineers, especially if you are also a scientist, engineer or nerd. Everybody admires Tesla or Feynman, or going more to the topic at hand (magnetics), Steinmetz or Dowell. They were great engineers that tried to comprehend their professional world, to model and tame it. And a monument to their success is how much their models are still used today, and how many subsequent models were based on their original work.
                        </p>
                        <p>Because of the vicissitudes of my professional life, I have ended up in a curious position where, for reasons not pertaining to this article, my duties include finding, understanding, implementing, and comparing models for magnetic components. And along this path I came across the work of Waseem Roshen. What did he model, you may wonder? Core losses like Steinmetz? Winding losses like Dowell? Well, both, which made it really easy for me to admire him.
                        </p>
                        <p>Since this article (or articles, depending on how benevolent Kleio (the ancient Greek muse of history) is with me) was intended to be about core losses, we will save his work on winding losses for another occasion and focus here on explaining how Roshen models the three sources of core losses—hysteresis, classical eddy current and excess eddy current losses. We’ll also discuss how these models compare with Steinmetz-derived models.
                        </p>
                        <p>But before we get into Roshen’s work on core losses, and in case some readers are not familiar with the core losses in magnetic components (or worse, they only know how to use the coefficients given by the core manufacturers), I would like to give a little introduction on the what and why of core losses as I understand them.
                        </p>

                        <h1 class="h2">The Physics Of Core Losses</h1>
                        <p>The core losses are a bulk term used to encompass the losses due to the different mechanisms happening inside a ferromagnetic core when we excite it with an alternating magnetic field. In the classical literature these mechanisms are usually listed as the following three types: hysteresis losses, eddy current losses, and excess eddy current losses.  
                        </p>
                        <p>
                        When a magnetic field (commonly referred to as an H field) is applied to a ferromagnetic material, some of its grains change their orientation, aligning themselves in the direction of the applied field, creating a magnetic flux inside the material. If the magnetic field strength increases, more grains align with the direction of the field, incrementing the magnetic flux. 
                        </p>
                        <p>
                        This ratio of conversion is called the material permeability, and its value is not constant: as the magnetic field increases its value, a lesser number of grains is left to align, and the conversion gain, the permeability, decreases. Eventually, the core reaches a point of saturation in which a perceptible increment of magnetic field strength produces an imperceptible increment in the magnetic flux.
                        </p>
                        <p>
                        If at this point, after applying the previously described magnetic field strength, we reverse the direction of the field, some of the earlier aligned grains will realign along the new direction, but a smaller number than before for the same delta of field: some of the grains that were aligned for a given increase in H field will remain unchanged for the same decrease in H field. If the H field is now constantly decreased, the ratio of alignment of grains, the permeability, will be analogous to the previous iteration, but the net number of realigned grains will be smaller than in the previous iteration for the same absolute value of H field.
                        </p>
                        <p>
                        This process can be repeated iteratively, and in each loop the number of grains that get aligned as we get farther from zero magnetic flux will be greater than the number aligning on the return when the magnetic flux nears zero. This produces a hysteresis effect and depicts a closed loop, were we to draw a graph with the magnetic field strength on one axis and the magnetic flux on the other axis as shown in the example B-H curve in Fig. 1.
                        </p>
                        <img src="/src/public/images/musings/4/image1.png" class="img-fluid bounce-little my-3 mx-auto d-block" alt="" style="width: 400px">
                        <p class="text-center">Fig. 1. B-H loop for Ferroxcube’s 3C90 core material, as presented in its datasheet.</p>

                        <p>
                        This additional energy needed to align the extra grains on the return to zero is lost in material resistance and wasted as heat. The total extent of wasted energy can be calculated by integrating the area of the hysteresis loop and is essentially independent of the frequency of the switching field; albeit for some materials the permeability might be shaped by this switching frequency. 
                        </p>
                        <p>
                        Lastly, the losses due to the hysteresis mechanism can be obtained by integrating the product of the energy and the switching frequency over the whole volume of the magnetic material subjected to the magnetic field, or over the effective volume provided by the manufacturer.
                        </p>
                        <p>
                        A side effect of the circulation of the magnetic field through the magnetic material is that, as a result of magnetic materials not having an infinite resistivity, electrical eddy currents will be induced within the volume of the core. The boundaries between the grains that comprise (as can be seen in Fig. 2) the ferromagnetic material have an amount of capacitance. So at low frequencies these induced eddy currents will exist only in the grains, circulating inside, therefore restricting the losses produced by them (eddy current losses are proportional to the area which they circle).
                        </p>

                        <img src="/src/public/images/musings/4/image2.png" class="img-fluid bounce-little my-3 mx-auto d-block" alt="" style="width: 400px">
                        <p class="text-center">Fig. 2. Micrograph of a polycrystalline metal (courtesy of the University of Cambridge).</p>


                        <p>
                        As the switching frequency of the magnetic field increases, the alternating frequency of the induced eddy currents also rises, and the capacitance of the grain boundaries starts preventing their flow. Longer eddy currents start spreading through the whole extent of the ferromagnetic core, escaping out of the grains, and producing increasing ohmic losses, and thus heat.
                        </p>
                        <p>
                        The losses produced by this mechanism are called bulk eddy current losses, or classical eddy current losses, and are heavily dependent on the magnetic core’s cross section, the square of the frequency, and the material’s resistivity. The issue with the latter term, resistivity, is that, for ferromagnetic cores, the resistivity is not a constant value dependent only on the temperature (as is the case for diamagnetic materials, e.g., copper); its resistivity varies also with the frequency of the field and magnetic flux inside the material, making it challenging to estimate.
                        </p>
                        <p>
                        The aforementioned explanation of eddy current losses assumes that the core material is homogeneous (as in all grains have equal size, domain walls and orientation), which is clearly false in reality, as can be observed in Fig. 2. This heterogeneity produces additional losses that are not taken into account by the classical eddy current model, and are known as excess eddy current losses. Such losses depend heavily on the size of the grain of the ferromagnetic material, its resistivity, and the switching frequency.
                        </p>

                        <p>
                        The sum of these losses is what many engineers know as core losses, though as has been analyzed this general term encompasses really different mechanisms. To be able to make an evaluation of these total losses, the Prussian Charles Proteus Steinmetz, proposed in the 19th century an analytical equation consisting of an exponential curve fit to empirical data which has to be measured for each material. This produces a series of power coefficients that scale the effects of the magnetic flux density, the switching frequency of the field and the material temperature in the total core losses, abstracting them from the physical mechanisms, using just measured data. Steinmetz’s equation for the volumetric losses Pv is
                        </p>
                        <img src="/src/public/images/musings/4/image3.png" class="img-fluid bounce-little my-3 mx-auto d-block" alt="">
                        <p>

                        where f is the switching frequency, B is the peak magnetic flux density, and k, a, and b are the Steinmetz coefficients, obtained by interpolating from measured data at a given temperature and for a given material.
                        </p>
                        <p>
                        The biggest issue with the approach created by Steinmetz is that these measurements and curve fits are commonly taken in small cores, where the eddy currents are inconsequential. When the core size grows, the eddy current losses start attaining an importance that Steinmetz’s model cannot predict.
                        </p>
                        <p>
                        Also, Steinmetz created his model at a time when only sinusoidal magnetic fields were used, but as power electronics developed, the magnetizing currents, and thus the magnetic fields and fluxes, became triangular in shape, with different duty cycles.
                        </p>
                        <p>
                        To take into account the effects of these triangular currents, many models inspired by Steinmetz were created, with the Improved Generalized Steinmetz Equation (iGSE)[1] being the most extended. This model breaks down the magnetic flux waveform into small pieces, calculating their energy, which then scales with the switching frequency, highly improving the accuracy for non-sinusoidal waveforms. The volumetric losses according to iGSE are 
                        </p>
                        <img src="/src/public/images/musings/4/image4.png" class="img-fluid bounce-little my-3 mx-auto d-block" alt="">
                        <p>
                        where T is the period, B is the magnetic flux density waveform, B is its peak-to-peak value, and ki is defined as
                        </p>
                        <img src="/src/public/images/musings/4/image5.png" class="img-fluid bounce-little my-3 mx-auto d-block" alt="">
                        <p>
                        where k, a, and b are the same Steinmetz coefficients as noted earlier. 
                        </p>
                        <p>
                        But was not this article about Roshen’s research? Yes, I am getting there. Waseem Roshen wrote two articles regarding core losses,[2, 3] one presenting his model for calculating hysteresis core losses, and a second one expanding it with an analysis and comparison of the classical eddy current loss model and the excess eddy current loss model presented by Bertotti.[4]  
                        </p>
                        <p>
                        The first publication presents Roshen’s model for estimating the hysteresis losses in a ferrite core. It consists of trying to predict the B-H loop from the following parameters provided by the manufacturer: saturation magnetic field, saturation magnetic flux density, coercive force, and remanence. 
                        </p>
                        <p>
                        With these four parameters the model constructs a piecewise function, formed by two hyperbolas, called the upper major loop, which represents the behavior of the upper part of the B-H loop in the core when excited at saturation point. The lower major loop is then extracted by symmetry. The excerpt below shows the equations given by Roshen for part of the major loop. 
                        </p>
                        <p>
                        “In this model, the major hysteresis loop is represented by two hyperbolas. The upper part (see Fig. 1) of the major loop is given by 
                        B = Fu(H)
                        </p>
                        <img src="/src/public/images/musings/4/image6.png" class="img-fluid bounce-little my-3 mx-auto d-block" alt="">

                        <p>
                        ”[2]
                        where Hc is the coercive force, Hs is the saturation magnetic field, Bs is saturation magnetic flux density; and a1, b1 and b2 are extracted by solving the system of equations given by
                        </p>
                        <p>
                        Bs = Fu(Hs)
                        </p>
                        <p>
                        -Bs = Fu(-Hs)
                        </p>
                        <p>
                        0 = Fu(Hc)
                        </p>
                        <p>
                        From this major loop, the model extracts what is called the minor loop: the behavior at the amplitude of the excitation for which we want to know the losses. To achieve this, Roshen suggests that both parts of the major loops be moved together iteratively until the crossing point equals our input amplitude. The images in Figs. 3, 4 and 5 show this process for Ferroxcube 3C90, at 25ºC, 0.1 and 0.2 T respectively
                        </p>
                        <img src="/src/public/images/musings/4/image7.jpg" class="img-fluid bounce-little my-3 mx-auto d-block" alt="">
                        <p class="text-center">Fig. 3. Major loop for Ferroxcube 3C90 at 25°C. </p>
                        <img src="/src/public/images/musings/4/image8.gif" class="img-fluid bounce-little my-3 mx-auto d-block" alt="">
                        <p class="text-center">Fig. 4. Loop approximation for 0.1 T</p>
                        <img src="/src/public/images/musings/4/image9.gif" class="img-fluid bounce-little my-3 mx-auto d-block" alt="">
                        <p class="text-center">Fig. 5. Loop approximation for 0.2 T</p>

                        <p>
                        Once the minor loop is obtained, the last step consists of integrating the area inside the loop, which represents the energy per cycle lost due to hysteresis, and multiplying it by the switching frequency to obtain the hysteresis losses (Fig. 6). 
                        </p>
                        <p>
                        This whole process can be fully automated from the numbers provided by the manufacturer, as mentioned before, or from a measured B-H curve. Concretely in this case, the whole process followed by the author of this article was to automatically extract (through a Python script) the four necessary parameters mentioned before from the B-H loops provided by the manufacturer at different temperatures, and then interpolate them for the requested temperature.
                        </p>
                        <p>
                        The final result is a model that is able to model the parabolic nature of the B-H loop at low excitation while keeping the hyperbolic nature as the material approaches saturation, and keeping it synchronized with the parameters measured for the material.
                        </p>
                        <img src="/src/public/images/musings/4/image10.gif" class="img-fluid bounce-little my-3 mx-auto d-block" alt="">
                        <p class="text-center">Fig. 6. BH loop for Ferroxcube 3C90 from 380 to 10 mT</p>
                        <p>
                        Before continuing to other losses, it must be mentioned that Roshen’s hysteresis model can be applied in its current form to any ungapped shape, with no dc bias; although I believe it could be properly extended to cover these cases, especially gapped cores, where the slope of the B-H loop would be modified according to the effective reluctance of the magnetic circuit.
                        </p>
                        <h1 class="h2">Classical And Excess Eddy Current Losses</h1>
                        <p>
                        We already know how to calculate the hysteresis losses for a given material and excitation, but we said that there were three terms in the total loss equation. Let’s talk about the two remaining ones as analyzed by Roshen.
                        </p>
                        <p>
                        The second paper published by Roshen I found really interesting because of its analysis, though it presents no technical novelty, just applying the models obtained by previous authors. He ties these models in with Steinmetz’s coefficients depending on magnetic flux density, frequency and waveform, explaining how the changes in the coefficients depend on the relative importance of each of the core loss mechanisms at the given excitation.
                        </p>
                        <p>
                        Roshen presents the classical and excess eddy current models, giving calculation methods for both, and compares them by creating a ratio which explains certain characteristics observed in ferrite cores of different sizes with different waveforms.
                        </p>
                        <p>
                        He analyzes how this ratio always depends on the square of the magnetic flux density and frequency product (see Fig. 7), so when this product is small (low frequency or low magnetic flux density, or a low combination of both), the excess eddy current losses are dominant over the classical/bulk eddy current losses. This means a lower Steinmetz coefficient for the frequency in this area (explained by the fact that the classical losses have a squared dependence on the frequency while the excess has only 3/2). And vice versa, at high frequency-magnetic flux density products, the classical losses have a higher weight, which increments the coefficients in Steinmetz’s equation.
                        </p>
                        <img src="/src/public/images/musings/4/image11.png" class="img-fluid bounce-little my-3 mx-auto d-block" alt="">

                        <p class="text-center">
                        Fig. 7. Variation of the ratio of classical eddy current loss to excess eddy current loss with the product of frequency and flux density.
                        </p>
                        <p> 
                        Another interesting observation is the increment of the ratio with the cross-sectional area. This means that bigger cores will have more losses than smaller cores at higher frequencies, a fact easily observable in reality. Even the core manufacturers warn of this effect, though few engineers take it into account.
                        </p>
                        <p>
                        Finally, any factor that distorts the waveform, like a high duty cycle, ensures that the loss distribution changes, which would also change the coefficients in Steinmetz’s formula, if we were to take them into account. This proves even further how it is not an adequate method to be used with non-sinusoidal loads.
                        </p>
                        <p>
                        If we extract the equations from the second paper, at this point, with the data provided by a core manufacturer, we are able to calculate two out of three terms of the core loss equation: hysteresis and classical eddy current losses, missing just one term in the equation for the excess eddy current losses. What Roshen recommends is to extract this term (the product of alpha and n0, in case you haven’t read the aforementioned papers) from any known loss measurements provided by the manufacturer or measured in your lab, as this product depends only on the material and won’t change with different shapes or excitations. Once this product term is extracted, it can be inserted in our now complete equation.
                        </p>
                        <p>
                        And if there are additional measurements, the dependence of the ferrite resistivity on the frequency, temperature and magnetic flux density can be extracted, as these parameters modify how the currents circulate in our material (as investigated by the prolific Waseem Roshen in reference [5]).
                        </p>
                        <p>
                        To conclude this article on Roshen’s core loss model, I must mention that, though the model can be daunting to implement without advanced knowledge of software, the benefit it provides—the ability to calculate core losses taking into account the shape of the ferrite core, and for any given excitation waveform—outweighs the difficulties and makes this model a fair rival to any Steinmetz-derived model.
                        </p>

                        <h1 class="h2">References</h1>
                        
                        <p>
                        1. "Accurate prediction of ferrite core loss with non-sinusoidal waveforms using only Steinmetz parameters" by K. Venkatachalam, C. R. Sullivan, T. Abdallah and H. Tacca, 2002 IEEE Workshop on Computers in Power Electronics, 2002. Proceedings, 2002, pp. 36-41, doi: 10.1109/CIPE.2002.1196712.). 
                        </p>
                        <p>
                         
                        2. "Ferrite core loss for power magnetic components design" by W. Roshen, IEEE Transactions on Magnetics, vol. 27, no. 6, pp. 4407-4415, Nov. 1991, doi: 10.1109/20.278656.
                        </p>
                        <p>
                         
                        3. "A Practical, Accurate and Very General Core Loss Model for Nonsinusoidal Waveforms" by W. A. Roshen, IEEE Transactions on Power Electronics, vol. 22, no. 1, pp. 30-40, Jan. 2007, doi: 10.1109/TPEL.2006.886608. 
                        </p>
                        <p>
                         
                        4. “Dependence on peak induction and grain size of power losses in nonoriented Si-Fe steels” by G. Ban and G. Bertotti, J. Appl. Phys., vol. 64, pp. 5361–5363, 1988.
                        </p>
                        <p>
                         
                        5. "High-Frequency Tunneling Magnetic Loss in Soft Ferrites" by W. A. Roshen, IEEE Transactions on Magnetics, vol. 43, no. 3, pp. 968-973, March 2007, doi: 10.1109/TMAG.2006.882750.
                        </p>


                        <p class="p mt-5">Produly originally published in http://www.how2power.com/pdf_view.php?url=/newsletters/2209/H2PowerToday2209_FocusOnMagnetics.pdf</p>
                    </div>
                </div>
            </div>
        </div>
    </main>
    <Footer />
</template>

