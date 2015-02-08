#!/usr/bin/env python3

import sys
from gi.repository import Gio, Gtk

cancelButton = (Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL)
fdType = int(sys.argv[1])
if fdType == 0:
    msg = "Open"
    action = Gtk.FileChooserAction.OPEN
    okButton = (Gtk.STOCK_OPEN, Gtk.ResponseType.OK)
elif fdType == 1:
    msg = "Save"
    action = Gtk.FileChooserAction.SAVE
    okButton = (Gtk.STOCK_SAVE, Gtk.ResponseType.OK)

buttons = cancelButton + okButton
filechooserdialog = Gtk.FileChooserDialog(title=msg, action=action, buttons=buttons)

if len(sys.argv) > 2:
    filechooserdialog.set_filename(sys.argv[2])
elif fdType == 2:
    filechooserdialog.set_current_name("sandbox.js")

if fdType == 1:
    filechooserdialog.set_do_overwrite_confirmation(True)


response=filechooserdialog.run()
if response == Gtk.ResponseType.OK:
    print (filechooserdialog.get_filename())
filechooserdialog.destroy()
