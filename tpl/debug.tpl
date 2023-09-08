<div class="modal debug" id="modal-debug" tabindex="-1" role="dialog">
  <div class="modal-dialog modal-dialog-custom" role="document">
      <div class="modal-content">
        <div class="modal-header">
            <span class="modal-title">Dashticz Debug Window<input id="debug-save" type="button" value="Save"/></span>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
            </button>
        </div>
        <div class="modal-body">

              <ul class="nav nav-tabs">
    <li class="active"><a data-toggle="tab" href="#debug-log">Log</a></li>
    <li><a data-toggle="tab" href="#debug-status">Status</a></li>
    <li><a data-toggle="tab" href="#debug-config">Config</a></li>
    <li><a data-toggle="tab" href="#debug-blocks">Blocks</a></li>
  </ul>

  <div class="tab-content">
    <div id="debug-log" class="tab-pane fade in active debug-items">
      <h3>Log</h3>
      <div id="debug-items" class="selectable"></div>
    </div>
    <div id="debug-status" class="tab-pane fade">
      <h3>Dashticz status info</h3>
      <h4>Latest Domoticz request:</h4>
      <div class="debug-status"></div>
      <div class="debug-memory-container">
        <canvas id="debug-memory"></canvas>
      </div>
    </div>
    <div id="debug-config" class="tab-pane fade selectable">
      <h3>Config settings</h3>
      <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam.</p>
    </div>
    <div id="debug-blocks" class="tab-pane fade selectable">
      <div class="items"></div>
    </div>
  </div>
</div>

        </div>
  </div>
</div>