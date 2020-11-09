Garbage Collector
=================

If you want to have a block with next pickup dates for your garbage, add the following to ``CONFIG.js``, and change zipcode & housenumber to the correct data::

    blocks['mygarbage'] = {
        company: 'cure',
        zipcode: '1234AB',
        street: 'vuilnisstraat',
        housenumber: 1,
        maxitems: 12,
        width: 12
    }

Next, add the garbage to a column, like::

  columns[1]['blocks'] = ['mygarbage']

You can change the colors of the trashcan (and/or the complete line) via the parameters in ``CONFIG.js``.

Parameters
----------

=======================   ===============================
Block Parameter           Description 
=======================   ===============================
company                   Garbage company to use. See :ref:`garbage_companies`
icalurl                   ``'<url>'``: In case the garbage company is ``url`` the URL of the ical-file.
zipcode                   The zipcode
street                    Your street
housenumber               Your housenumber
maxitems                  Number of items to show
width                     ``1..12``: Width of the block
hideicon                  ``true / false``: To hide the garbage icon
use_names                 ``true / false``: shows name of the garbage type
use_colors                ``true / false``: shows coloring for complete line
icon_use_colors           ``true / false``: shows colored or only white trashcan
title                     Title text
use_cors_prefix           ``true / false``: use a CORS proxy for getting data from provider. See :ref:`dom_CORS_proxy`
mapping                   Translation from description of the pickup event to a garbage type.  See :ref:`par_garbage`.
garbage                   Settings for different garbage types. See :ref:`par_garbage`.
=======================   ===============================

These block parameters can also be globally via a CONFIG.js setting:

=======================   ===============================
CONFIG setting            Description 
=======================   ===============================
garbage_use_cors_prefix   ``true / false``: use a CORS proxy for getting data from provider. See :ref:`dom_CORS_proxy`
garbage_mapping           Translation from description of the pickup event to a garbage type.  See :ref:`par_garbage`.
garbage                   Settings for different garbage types. See :ref:`par_garbage`.
=======================   ===============================

Usage
-----

.. _par_garbage :

Garbage type, color and icon
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Dashticz uses two steps to show the garbage pickup type with the correct icon, text and coloring.

#. Garbage type detection. Configurable via parameter ``garbage_mapping``
#. Settings (color, icon) per carbage type. Configurable via parameter ``garbage``

To determine the garbage type Dashticz searches for certain text in the description of the garbage pickup event. Example for the default definition::

    config['garbage_mapping'] = {
        rest: ['grof', 'grey', 'rest', 'grijs','grijze'],
        gft: ['gft', 'tuin', 'refuse bin', 'green', 'groen', 'Biodégradables', 'snoei'],
        pmd: ['plastic', 'pmd', 'verpakking', 'kunststof', 'valorlux'],
        papier: ['papier', 'blauw', 'blue', 'recycling bin collection'],
        kca: ['chemisch', 'kca','kga'],
        brown: ['brown', 'verre'],
        black: ['black', 'zwart'],
        milieu: ['milieu'],
        kerstboom: ['kerst'],
    };

As you can see 9 different garbage types have been defined.
Looking at the first line of the garbage mapping: If the description of the pickup event contains the text ``grey`` the garbage type ``rest`` will be selected.

.. note :: The first rule that has a match with the event description will be selected.

After the mapping on a garbage type, the name, color and icon can be configured per garbage type as follows::

    config['garbage'] = {
        gft: {kliko: 'green', code: '#375b23', name: 'GFT', icon: 'img/garbage/kliko_green.png'},
        pmd: {kliko: 'orange', code: '#db5518', name: 'PMD', icon: 'img/garbage/kliko_orange.png'},
        rest: {kliko: 'grey', code: '#5e5d5c', name: 'Restafval', icon: 'img/garbage/kliko_grey.png'},
        papier: {kliko: 'blue', code: '#153477', name: 'Papier', icon: 'img/garbage/kliko_blue.png'},
        kca: {kliko: 'red', code: '#b21807', name: 'Chemisch afval', icon: 'img/garbage/kliko_red.png'},
        brown: {kliko: 'brown', code: '#7c3607', name: 'Bruin', icon: 'img/garbage/kliko_brown.png'},
        black: {kliko: 'black', code: '#000000', name: 'Zwart', icon: 'img/garbage/kliko_black.png'},
        milieu: {kliko: 'yellow', code: '#f9e231', name: 'Geel', icon: 'img/garbage/kliko_yellow.png'},
        kerstboom: {kliko: 'green', code: '#375b23', name: 'Kerstboom', icon: 'img/garbage/tree.png'},
    };

The two examples above show the default definition of the ``garbage_mapping`` and ``garbage`` parameters. 
You can redefine them in your ``CONFIG.js``.


.. _garbage_companies :

Currently supported cities/companies/services
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

===================     =========================
Company                 City or area
===================     =========================
afvalalert              (Not working)
afvalstoffendienst      Afvalstoffendienst: 's-Hertogenbosch, Vlijmen, ... (NL)
almere                  Almere (NL)
alphenaandenrijn        Alphen aan de Rijn (NL)
area                    Coevorden, Emmen, Hoogeveen (NL)
avalex                  Avalex: Delft, ... (NL)
barafvalbeheer          Bar-afvalbeheer for Barendrecht, Rhoon (NL)
best                    Best (NL)
blink                   Blink: Asten, Deurne, Gemert-Bakel, Heeze-Leende, Helmond, Laarbeek, Nuenen, Someren (NL)
circulusberkel          Circulus Berkel: Apeldoorn, Bronckhorst, Brummen, Deventer, Doesburg, Epe, Lochem, Zutphen en Voorst (NL)
cure                    Cure: Eindhoven, Geldrop-Mierlo, Valkenswaard (NL)
cyclusnv                Cyclus NV: Bodegraven-Reeuwijk, Gouda, Kaag en Braassem, Krimpen aan den IJssel, Krimpenerwaard, Montfoort, Nieuwkoop, Waddinxveen en Zuidplas (NL)
dar                     Dar: Berg en Dal, Beuningen, Druten, Heumen, Nijmegen, Wijchen (NL)
deafvalapp              Afval App (NL)
edg                     EDG (DE)
gad                     Grondstoffen- en Afvalstoffendienst regio Gooi en Vechtstreek (NL)
gemeenteberkelland      Berkelland: Borculo, Eibergen, Neede en Ruurlo (NL)
goes                    Goes (NL)  
googlecalendar          file in iCal format
groningen               Groningen (NL)  
hvc                     HVC Groep: 44 gemeenten in Flevoland, Noord- en Zuid-Holland (NL)  
ical                    File in iCal format
meerlanden              Meerlanden: Aalsmeer, Bloemendaal, Diemen, Haarlemmermeer, Heemstede, Hillegom, Lisse, Noordwijk en Zandvoort (NL)  
mijnafvalwijzer         Mijn Afval Wijzer (NL)
omrin                   Leeuwarden, Opsterland, Heerenveen, Waadhoeke, ...   
purmerend               Purmerend (NL)
rd4                     RD4: Beekdaelen, Brunssum, Eijsden-Margraten, Gulpen-Wittem, Heerlen, Kerkrade, Landgraaf, Simpelveld, Vaals en Voerendaal
recycleapp              RecycleApp (BE)
rmn                     RMN: Baarn, Zeist, Nieuwegein,  (NL)  
rova                    Rova (NL)
suez                    Suez: Arnhem (NL)  
sudwestfryslan          Sudwest Fryslan (NL)  
twentemilieu            Twente Milieu (NL)  
uden                    Uden (NL)  
veldhoven               Veldhoven (NL)  
venlo                   Venlo (NL)  
venray                  Venray (NL)  
vianen                  Vianen (NL)  
waalre                  Waalre (NL)
waardlanden             Waardlanden: Gorinchem, Hardinxveld-Giessendam, Molenlanden en Vijfheerenlanden (NL)  
===================     =========================

Styling
~~~~~~~

Via ``custom.css`` the appearance of the garbage blocks can be modified.

The generic CSS selector for a garbage block is ``.garbage``. To select a specific garbage block, you can use ::

    [data-id='mygarbage'].garbage

To give the garbage block a fixed height in combination with a vertical scroll bar if needed::

    .garbage {
        height: 140px;
        overflow: auto
    }

Additional CSS classes are applied to the garbage content as follows:

* ``.trashtoday``:  For garbage collection scheduled for today
* ``.trashtomorrow``: For garbage collection scheduled for tomorrow
* ``.trashrow``: For garbage collection scheduled for the days after tomorrow


.. _garbage_upgrade :

Upgrade from Dashtcz 3.6.6 and earlier
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

In earlier versions of Dashticz the garbage block was configured via settings in CONFIG.js as follows::

    var config ={}
    config['garbage_company'] = 'cure';
    config['garbage_icalurl'] = 0;
    config['garbage_zipcode'] = '1234AB';
    config['garbage_street'] = 'vuilnisstraat';
    config['garbage_housenumber'] = '1';
    config['garbage_maxitems'] = '12';
    config['garbage_width'] = '12';

Although this still is supported, it's recommend to switch to the new block method as described in the first section.
