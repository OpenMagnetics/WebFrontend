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

                        <p class="p fs-5 mt-5">Produly originally published in <a class="p mt-5" href="http://www.how2power.com/pdf_view.php?url=/newsletters/2209/H2PowerToday2209_FocusOnMagnetics.pdf">How2Power.com September 2022</a></p>
                        
                        <p>Sometimes it is easy to admire famous scientists/engineers, especially if you are also a scientist/engineer/nerd. Everybody admires Tesla or Feynman, or going more to the topic at hand (magnetics), Steinmetz or Dowell. They were great engineers (no pun intended) that tried to comprehend their professional world, to model and tame it. And a monument to their success if how much their models are still used, and how many posterior models are based on their original work.
                        </p>
                        <p>Because of the vicissitudes of my professional life, I have ended up in a curious position where, for reasons not pertaining to this article, part of my duties are finding, understanding, implementing, and comparing models for magnetic components. And along this path I came across the work of Waseem Roshen. What did he model, you may wonder? Core losses like Steinmetz? Winding losses like Dowell? Well, both, which made it really easy for me to admire.
                        </p>
                        <p>Since this article (or articles, depending on how benevolent Kleio is with me) was thought to be about core losses, we will talk about his work on winding losses for another occasion.
                        </p>
                        <p>But before we get into Roshen’s work on core losses, and in case some readers are not familiar with the core losses in magnetic components (or worse, they just know how to use the coefficients given by the manufacturers), I would like to do a little introduction on what and why. At least how I understand them.
                        </p>

                        <p>The core losses are a bulk term used to encompass the losses due to the different mechanisms happening inside a ferromagnetic core when we excite it with an alternating magnetic field. In the classical literature these mechanisms are usually listed as the following three types: hysteresis losses, eddy current losses, and excess eddy current losses.  
                        </p>
                        <p> When a magnetic field (commonly referred as H field) is applied to a ferromagnetic material, some of its grains change their orientation, aligning themselves in the direction of the applied field, creating a magnetic flux inside the material. If the magnetic field strength increases, more grains align with the direction of the field, incrementing the magnetic flux. 
                        </p>
                        <p>
                        This ratio of conversion is called the material permeability, and its value is not constant: as the magnetic field increases its value, less quantity of grains are left to align, and the conversion gain, the permeability, decreases; prior to reaching a point of saturation in which a perceptible increment of magnetic field strength produces an imperceptible increment in the magnetic flux. 
                        </p>
                        <p>
                        If at this point, after applying the previously described magnetic field strength, we reverse the direction of the field, part of the earlier aligned grains will realign along the new direction, but less amount than before for the same delta of field: some of the grains that were aligned for a given increase of H field will remain unchanged for the same decrease of H field. If the H field is now constantly decreased, the ratio of alignment of grains, the permeability, will be analogous to the previous iteration, but the net number of realigned grains will be smaller than in the previous iteration for the same absolute value of H field.
                        </p>
                        <p>
                        This process can be repeated iteratively, and in each loop the number of grains that got aligned as we got farther from zero magnetic flux will be greater than the number aligning on the return when the magnetic flux nears zero; producing a hysteresis effect and depicting a closed loop, were we to draw a graph with the magnetic field strength on one axis and the magnetic flux on the other axis as shown in the example B-H curve in Fig. 1. 
                        </p>
                        <img src="/images/musings/4/image1.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="3C90 BH loop saturation" width="400" height="auto" >
                        <p class="text-center">Fig. 1. B-H loop for Ferroxcube’s 3C90 core material, as presented in its datasheet.</p>

                        <p>
                        This additional energy needed to align the extra grains on the return to zero is lost in material resistance and wasted as heat. The total extent of wasted energy can be calculated by the area integration of the hysteresis loop and is essentially independent of the frequency of the switching field; albeit for some materials the permeability might be shaped by this switching frequency.
                        </p>
                        <p>
                        Lastly, the losses due to the hysteresis mechanism can be obtained by integrating the product of the energy and the switching frequency over the whole volume of the magnetic material subjected to the magnetic field, or over the effective volume provided by the manufacturer.
                        </p>
                        <p>
                        A side effect of the circulation of the magnetic field through the magnetic material is that, as a result of magnetic materials not having an infinite resistivity, electrical eddy currents will be induced within the volume of the core. The boundaries between the grains that comprise the ferromagnetic material have an amount of capacitance, so at low frequencies these induced eddy currents will exists only in the grains, circulating inside, therefore restricting the losses produced by them (eddy current losses are proportional to the area in which they circle).
                        </p>

                        <img src="/images/musings/4/image2.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="microprah polychristalline metal" width="400" height="auto">
                        <p class="text-center">Micrograph of a polycrystalline metal, courtesy of Wikipedia</p>

                        <p>
                        As the switching frequency of the magnetic field increases, the alternating frequency of the induced eddy currents also enlarges, and the capacitance of the grain boundaries starts preventing their flow. Longer eddy currents start spreading through the whole extent of the ferromagnetic core, escaping out of the grains, and producing increasing ohmic losses, and thus heat. 
                        </p>
                        <p>
                        The losses produced by this mechanism are called Bulk Eddy Current Losses, or Classical Eddy Current Losses, and are heavily dependent on the magnetic core’s cross section, the square of the frequency, and the material’s resistivity. The issue with the latter term, resistivity, is that, for ferromagnetic cores, the resistivity is not a constant value dependent only on the temperature (as is the case for diamagnetic materials, e.g. copper); its resistivity varies also with the frequency of the field and magnetic flux inside the material, making it challenging to estimate.
                        </p>
                        <p>
                        The aforementioned explanation for Eddy Current Losses assumes that the core material is homogeneous (as in all grains have the equal size, domain walls and orientation), which is clearly false in reality. This heterogeneity produces additional losses that are not taken into account by the classical eddy current model, and are known as Excess Eddy Current Losses, dependending heavily on the size of the grain of the ferromagnetic material, its resistivity, and the switching frequency.
                        </p>

                        <p>
                        The sum of these losses is what many engineers know as core losses, though as has been analyzed it encases really different mechanisms. To be able to make an evaluation of these total losses, the Prussian Charles Proteus Steinmetz, proposed in the 19th century an analytical equation consisting of an exponential curve fit to empirical data which has to be measured for each material, ensuing a series of power coefficients that scale the effects of the magnetic flux density, the switching frequency of the field and the material temperature in the total core losses, abstracting them from the physical mechanisms, using just measured data. Steinmetz’s equation for the volumetric losses Pv is 
                        </p>
                        <img src="/images/musings/4/image3.svg" class="img-fluid bounce-little my-3 mx-auto d-block" alt="Steinmetz equation" width="200" height="auto">
                        <p>

                        where f is the switching frequency, B is the peak magnetic flux density, and k, a, and b are the Steinmetz coefficients, obtained by interpolating from measured data at a given temperature and for a given material. 
                        </p>
                        <p>
                        The largest issue with the approach created by Steinmetz is that these measurements and curve fits are commonly taken in small cores, where the eddy currents are inconsequential. When the core size grows, the eddy currents losses start attaining an importance that Steinmetz’s model cannot predict. 
                        </p>
                        <p>
                        Steinmetz created his model at a time when only sinusoidal magnetic fields were used, but as power electronics developed, the magnetizing currents, and thus the magnetic fields and fluxes, became triangular in shape, with different duty cycles. 
                        </p>
                        <p>
                        To take into account the effects of these triangular currents, many models inspired by Steinmetz were created, being the Improved Generalized Steinmetz Equation (iGSE) [1] the most used. This model breaks down the magnetic flux waveform into small pieces, calculating their energy, which then scales with the switching frequency, highly improving the accuracy for non-sinusoidal waveforms.
                        </p>
                        <img src="/images/musings/4/image4.svg" class="img-fluid bounce-little my-3 mx-auto d-block" alt="Improved Generalized Steinmetz Equation" width="400" height="auto">
                        <p>
                        Volumetric losses according to iGSE, where T is the period, B the magnetic flux density waveform, 𝚫B is its peak to peak value, ki is defined as:
                        </p>
                        <img src="/images/musings/4/image5.svg" class="img-fluid bounce-little my-3 mx-auto d-block" alt="Improved Generalized Steinmetz Equation ki coeff" width="400" height="auto">
                        <p>
                        with k, a, and b the same Steinmetz coefficients as earlier.
                        </p>
                        <p>
                        What was not this article about Roshen’s research? Yes, I am getting there. Waseem Roshen wrote two articles regarding core losses ([2, 3]), one presenting his model for calculating hysteresis core losses, and a second one expanding it with an analysis and comparison of the classical eddy current losses model and the excess eddy current losses model presented by Bertotti [4].   
                        </p>
                        <p>
                        The first publication presents Roshen’s model for estimating the Hysteresis losses in a ferrite core. It consists of trying to predict the B-H loop from the following parameters provided by the manufacturer: saturation magnetic field, saturation magnetic flux density, coercive force, and remanence. 
                        </p>
                        <p>
                        With these four parameters the model constructs a piecewise function, formed by two hyperbolas, called the upper major loop, which represents the behavior of the upper part of the BH loop in the core when excited at saturation point. The lower major loop is then extracted by symmetry.
                        </p>
                        <p>
                        “In this model, the major hysteresis loop is represented by two hyperbolas. The upper part (see Fig. 1) of the major loop is given by 
                        B = Fu(H)
                        </p>
                        <img src="/images/musings/4/image6.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="Roshen major loop" width="600" height="auto">

                        <p>
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
                        From this major loop, the model extracts what is called the minor loop: the behavior at the amplitude of the excitation for which we want to know the losses. To achieve this, the author suggests that both parts of the major loops be moved together iteratively until the crossing point equals our input amplitude. Following gif shows this process for Ferroxcube 3C90, at 25ºC, for 0.1 and 0.2 Teslas respectively.
                        </p>
                        <img src="/images/musings/4/image7.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="Major loop Ferroxcube 3C90" width="513" height="auto">
                        <p class="text-center">Fig. 3. Major loop for Ferroxcube 3C90 at 25°C. </p>
                        <video playsinline autoplay muted loop width="640" class="img-fluid bounce-little my-3 mx-auto d-block">
                            <source src="/images/musings/4/image8.webm" type="video/webm">
                        </video>

                        <p class="text-center">Fig. 4. Loop approximation for 0.1 T</p>
                        <video playsinline autoplay muted loop width="640" class="img-fluid bounce-little my-3 mx-auto d-block">
                            <source src="/images/musings/4/image9.webm" type="video/webm">
                        </video>
                        <p class="text-center">Fig. 5. Loop approximation for 0.2 T</p>

                        <p>
                        Once the minor loop is obtained, the last step consists of integrating the area inside the loop, which represents the energy per cycle lost due to hysteresis, and multiplying it by the switching frequency to obtain the hysteresis losses. 
                        </p>
                        <p>
                        This whole process can be fully automated from the numbers provided by the manufacturer, as mentioned before, or from a measured BH curve. Concretely in this case, the whole process followed by the author of this article was to automatically extract (through a Python script) the four necessary parameters mentioned before from the BH loops provided by the manufacturer at different temperatures, and then interpolate them for the requested temperature.
                        </p>
                        <p>
                        The final result is a model that is able to model the parabolic nature of the BH loop at low excitation while keeping the hyperbolic nature as the material approaches saturation, and keeping it synchronized with the parameters measured by the material.
                        </p>
                        <video playsinline autoplay muted loop width="640" class="img-fluid bounce-little my-3 mx-auto d-block">
                            <source src="/images/musings/4/image10.webm" type="video/webm">
                        </video>
                        <p class="text-center">Fig. 6. BH loop for Ferroxcube 3C90 from 380 to 10 mT</p>
                        <p>
                        Before continuing to other losses, it must be mentioned that Roshen’s Hysteresis model can be applied in its current form to any ungapped shape, with no DC bias; although I believe it could be properly extended to cover these cases, especially gapped cores, where the slope of  the BH loop would be modified according to the effective reluctance of the magnetic circuit.
                        </p>
                        <p>
                        We already know how to calculate the hysteresis losses for a given material and excitation, but we said that there were three terms in the total losses equation. Let’s talk about the two remaining ones.
                        </p>
                        <p>
                        The second paper published by Roshen I found really interesting because of its analysis, though it presents no technical novelty, just applying the models obtained by previous authors. He ties these models with Steinmetz’s coefficients depending on magnetic flux density, frequency and waveform, explaining how the changes on the coefficients depend on the relative importance of each of the core losses mechanisms at the given excitation.
                        </p>
                        <p>
                        Roshen presents the classical and excess eddy current models, giving calculation methods for both, and compares them creating a ratio which explains certain characteristics observed in ferrite cores of different sizes with different waveforms.
                        </p>
                        <p>
                        He analyzes how this ratio always depend of the square of the magnetic flux density and frequency product, so when this product is small (low frequency or low magnetic flux density, or a low combination of both), the excess eddy current losses are dominant over the classical/bulk eddy current losses, which means a lower Steinmetz coefficient for the frequency in this area (explained because the classical losses have a squared dependence with the frequency while the excess has only 3/2). And vice versa, at high frequency-magnetic flux density products, the classical losses have a higher weight, which increments the coefficients in Steinmetz’s equation.
                        </p>
                        <img src="/images/musings/4/image11.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="Classical eddy current variation with the priduct of frequency and mangetic flux density" width="500" height="auto">

                        <p class="text-center">
                        Fig. 7. Variation of the ratio of classical eddy current loss to excess eddy current loss with the product of frequency and flux density. 
                        </p>
                        <p> 
                        Another interesting conclusion is that the increment of the ratio with the cross section area, which means that bigger cores will have more losses than small cores at higher frequencies, a fact easily observable in reality, and it is even warned by the manufacturers, though few engineers take it into account.
                        </p>
                        <p>
                        Finally, any factor that distorts the waveform, like a high duty cycle, produce that the losses distribution changes, which would also change the coefficients in the Steinmetz’s formula, if we were to take them into account, proving even further how it is not an adequate method to be used in non-sinusoidal loads.
                        </p>
                        <p>
                        If we extract the equations from the second paper, at this point, with the data provided by the manufacturer, we are able to calculate the two out of three terms of the core losses equation: hysteresis and classical eddy current losses, missing just one term in the equation of the excess eddy current losses. What Roshen recommends is to extract this term (the product of alpha and n0, in case you haven’t read the aforementioned papers) from any known losses measurements provided by the manufacturer or measured in our lab, as this product depends only on the material and won’t change with different shapes or excitations; and insert it in our now complete equation.
                        </p>
                        <p>
                        Additionally, if there are additional measurements, the dependence of the ferrite resistivity with the frequency, temperature and magnetic flux density can be extracted, as these parameters modify how the currents circulate in our material (as investigated by the everpresent Waseem Roshen in [5]).
                        </p>
                        <p>
                        To conclude this article of the Roshen’s core losses model, I must mention that, though the model can be daunting to implement without advanced knowledge of software, the benefit it provides, the ability to calculate core losses taking into account the shape of the ferrite core, and for any given excitation waveform, outweighs the difficulties and makes of this model a fair rival to any Steinmetz-derived model.
                        </p>

                        <h2 class="h2">References</h2>
                        
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


                        <p class="p fs-5 mt-5">Produly originally published in <a class="p mt-5" href="http://www.how2power.com/pdf_view.php?url=/newsletters/2209/H2PowerToday2209_FocusOnMagnetics.pdf">How2Power.com September 2022</a></p>
                    </div>
                </div>
            </div>
        </div>
    </main>
    <Footer />
</template>

