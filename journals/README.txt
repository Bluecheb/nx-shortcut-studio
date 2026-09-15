NX Shortcut Studio - Create Reference Geometry toggle

ToggleCreateReferenceGeometry.vb flips the NX 2606 session preference that controls
whether newly drawn sketch curves are created as reference geometry. It does not
convert existing curves and it does not create a derived construction line.

ToggleCreateReferenceGeometry.dll is a compiled copy built against the installed
Designcenter 2606 NX Open libraries. The readable .vb journal remains the easiest
way to test the behavior before registering a user-defined command.

First test
1. In NX, choose Tools > Journal > Play.
2. Select ToggleCreateReferenceGeometry.vb.
3. Start Line and confirm that Create Reference Geometry matches the ON/OFF message.

Keyboard setup
NX must register the journal as a user-defined command before an .mtx accelerator
can call it. Create a user-defined command for this journal through NX Customize,
then save/export a small role. Use the command ID written by NX in that role in the
Shortcut Studio "Registered command ID" field. Click "Add to Sketching shortcuts",
press the desired key, and export the complete .mtx role.

Do not use the suggested placeholder ID unless NX actually registered that exact ID.
If NX generates an opaque ID, paste the generated value instead.
